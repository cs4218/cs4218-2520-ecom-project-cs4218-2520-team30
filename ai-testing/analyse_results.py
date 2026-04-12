#!/usr/bin/env python3
"""
AI-Driven Test Result Analyser
===============================
Reads Jest and/or Playwright test result JSON files and sends them to Claude API
for intelligent analysis: failure classification, brittle test detection, and anti-pattern reporting.

Usage:
    python ai-testing/analyse_results.py [--jest <path>] [--playwright <path>] [--history <path>]

Requirements:
    pip install anthropic

Environment:
    ANTHROPIC_API_KEY  — your Anthropic API key (get one at console.anthropic.com)
"""

import argparse
import json
import os
import sys
import textwrap
from datetime import datetime
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("ERROR: anthropic library not installed. Run: pip install anthropic")
    sys.exit(1)

# Auto-load .env from project root (same folder as this script's parent)
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())


# ─── Paths (relative to repo root) ─────────────────────────────────────────────
REPO_ROOT = Path(__file__).parent.parent
SYSTEM_PROMPT_PATH = Path(__file__).parent / "system_prompt.txt"
HISTORY_PATH = Path(__file__).parent / "run_history.json"
REPORTS_DIR = REPO_ROOT / "reports"


# ─── Helpers ────────────────────────────────────────────────────────────────────

def load_system_prompt() -> str:
    with open(SYSTEM_PROMPT_PATH, "r") as f:
        return f.read()


def load_jest_results(path: Path) -> dict | None:
    """Parse Jest --json output file."""
    if not path.exists():
        return None
    with open(path) as f:
        raw = json.load(f)

    tests = []
    for suite in raw.get("testResults", []):
        file_path = suite.get("testFilePath", "")
        short_path = "/".join(file_path.replace("\\", "/").split("/")[-2:])
        for t in suite.get("testResults", []):
            tests.append({
                "name": t.get("fullName", ""),
                "suite": short_path,
                "status": t.get("status", "unknown"),
                "duration_ms": t.get("duration", 0),
                "failure_messages": t.get("failureMessages", []),
            })

    return {
        "source": "jest",
        "run_summary": {
            "total_tests": raw.get("numTotalTests", 0),
            "passed": raw.get("numPassedTests", 0),
            "failed": raw.get("numFailedTests", 0),
            "skipped": raw.get("numPendingTests", 0),
            "duration_ms": sum(
                (s.get("perfStats", {}).get("end", 0) - s.get("perfStats", {}).get("start", 0))
                for s in raw.get("testResults", [])
            ),
        },
        "tests": tests,
    }


def load_playwright_results(path: Path) -> dict | None:
    """Parse Playwright JSON reporter output."""
    if not path.exists():
        return None
    with open(path) as f:
        raw = json.load(f)

    tests = []
    total = passed = failed = skipped = 0

    def walk_suite(suite, parent_file=""):
        nonlocal total, passed, failed, skipped
        file_path = suite.get("file", parent_file)
        short_path = "/".join(file_path.replace("\\", "/").split("/")[-2:])

        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                status = test.get("status", "unknown")
                results = test.get("results", [{}])
                error = results[0].get("error", {}).get("message", "") if results else ""
                duration = results[0].get("duration", 0) if results else 0

                total += 1
                if status == "expected":
                    passed += 1
                elif status in ("unexpected", "failed"):
                    failed += 1
                elif status == "skipped":
                    skipped += 1

                tests.append({
                    "name": spec.get("title", ""),
                    "suite": short_path,
                    "status": "passed" if status == "expected" else "failed" if status in ("unexpected", "failed") else "skipped",
                    "duration_ms": duration,
                    "failure_messages": [error] if error else [],
                })

        for child in suite.get("suites", []):
            walk_suite(child, file_path)

    for suite in raw.get("suites", []):
        walk_suite(suite)

    return {
        "source": "playwright",
        "run_summary": {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "duration_ms": raw.get("stats", {}).get("duration", 0),
        },
        "tests": tests,
    }


def load_history() -> list:
    """Load the last 5 run summaries for flaky test detection."""
    if not HISTORY_PATH.exists():
        return []
    with open(HISTORY_PATH) as f:
        data = json.load(f)
    return data[-5:]  # last 5 runs only


def save_to_history(analysis: dict, sources: list[str]):
    """Append this run's failed test names to the history file for future flaky detection."""
    history = []
    if HISTORY_PATH.exists():
        with open(HISTORY_PATH) as f:
            history = json.load(f)

    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "sources": sources,
        "failed_test_names": [t["name"] for t in analysis.get("failed_tests", [])],
        "total_tests": analysis.get("run_summary", {}).get("total_tests", 0),
        "failed": analysis.get("run_summary", {}).get("failed", 0),
        "overall_health": analysis.get("run_summary", {}).get("overall_health", "unknown"),
    }
    history.append(entry)
    history = history[-20:]  # keep last 20 runs max

    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(HISTORY_PATH, "w") as f:
        json.dump(history, f, indent=2)


def _trim_payload(payload: dict) -> dict:
    """
    Reduce payload size before sending to Claude.
    - Failed/skipped tests: send full detail (name, suite, error messages)
    - Passing tests: send only name + suite (needed for anti-pattern detection)
    This keeps token usage low without losing analytical value.
    """
    trimmed_results = []
    total_passed = total_failed = total_skipped = total_all = 0

    for result in payload.get("results", []):
        tests = result.get("tests", [])
        failed_tests = [
            {
                "name": t["name"],
                "suite": t["suite"],
                "status": t["status"],
                "duration_ms": t.get("duration_ms", 0),
                # Trim error messages to first line, max 200 chars
                "failure_messages": [
                    m.split("\n")[0][:200] for m in t.get("failure_messages", []) if m
                ][:2],  # at most 2 messages
            }
            for t in tests if t.get("status") in ("failed", "pending")
        ]
        # Passing tests: only name + suite for anti-pattern checking
        passing_names = [
            {"name": t["name"], "suite": t["suite"]}
            for t in tests if t.get("status") == "passed"
        ]

        s = result.get("run_summary", {})
        total_passed += s.get("passed", 0)
        total_failed += s.get("failed", 0)
        total_skipped += s.get("skipped", 0)
        total_all += s.get("total_tests", 0)

        trimmed_results.append({
            "source": result.get("source", "unknown"),
            "run_summary": s,
            "failed_tests": failed_tests,
            "passing_test_names": passing_names,
        })

    return {
        "overall_summary": {
            "total_tests": total_all,
            "passed": total_passed,
            "failed": total_failed,
            "skipped": total_skipped,
            "sources": [r["source"] for r in trimmed_results],
        },
        "results": trimmed_results,
    }


def call_claude(payload: dict, history: list) -> dict:
    """Send trimmed test results to Claude and return the parsed JSON analysis."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set.")
        print("Add ANTHROPIC_API_KEY=sk-ant-... to your .env file")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    system_prompt = load_system_prompt()

    # Trim payload to keep token usage low
    trimmed = _trim_payload(payload)
    total = trimmed["overall_summary"]["total_tests"]
    failed = trimmed["overall_summary"]["failed"]
    print(f"Payload trimmed: {total} tests ({failed} failed) across "
          f"{len(trimmed['results'])} suite(s)")

    user_content = f"Analyse these test results:\n\n{json.dumps(trimmed, indent=2)}"
    if history:
        user_content += (
            f"\n\nHistorical data from last {len(history)} runs "
            f"(use for flaky detection):\n{json.dumps(history, indent=2)}"
        )
    else:
        user_content += "\n\nNo historical data yet — leave flaky_tests as []."

    print("Calling Claude API...")
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_content}],
    )

    raw_text = response.content[0].text.strip()

    # Handle case where Claude wraps JSON in ```json ... ``` code fences
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()
        raw_text = "\n".join(
            line for line in lines
            if not line.strip().startswith("```")
        ).strip()

    if not raw_text:
        print("ERROR: Claude returned an empty response.")
        print("This usually means the payload is still too large or the API key is invalid.")
        sys.exit(1)

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        print(f"ERROR: Claude returned invalid JSON: {e}")
        print(f"First 500 chars of response: {raw_text[:500]}")
        sys.exit(1)


# ─── Pretty-print report ─────────────────────────────────────────────────────────

COLOURS = {
    "red": "\033[91m",
    "yellow": "\033[93m",
    "green": "\033[92m",
    "cyan": "\033[96m",
    "bold": "\033[1m",
    "reset": "\033[0m",
}

def c(text, colour):
    return f"{COLOURS.get(colour, '')}{text}{COLOURS['reset']}"


def print_report(analysis: dict):
    s = analysis.get("run_summary", {})
    health = s.get("overall_health", "unknown")
    health_colour = {"healthy": "green", "degraded": "yellow", "critical": "red"}.get(health, "cyan")

    print()
    print(c("=" * 60, "bold"))
    print(c("  AI TEST RESULT ANALYSIS", "bold"))
    print(c("=" * 60, "bold"))
    print()

    # Summary
    print(c("SUMMARY", "bold"))
    print(f"  Total Tests : {s.get('total_tests', '?')}")
    print(f"  Passed      : {c(s.get('passed', '?'), 'green')}")
    print(f"  Failed      : {c(s.get('failed', '?'), 'red')}")
    print(f"  Skipped     : {s.get('skipped', '?')}")
    print(f"  Duration    : {s.get('duration_ms', 0) / 1000:.1f}s")
    print(f"  Health      : {c(health.upper(), health_colour)}")
    if s.get("health_reason"):
        print(f"  Reason      : {s['health_reason']}")
    print()

    # Failed tests
    failed = analysis.get("failed_tests", [])
    if failed:
        print(c(f"FAILED TESTS ({len(failed)})", "red"))
        for t in failed:
            print(f"  {c('✗', 'red')} {t['name']}")
            print(f"    Suite   : {t.get('suite', '?')}")
            print(f"    Type    : {t.get('failure_type', '?')}")
            print(f"    Error   : {t.get('error_message', '?')}")
            print(f"    Fix     : {c(t.get('fix_hint', '?'), 'cyan')}")
            print()
    else:
        print(c("FAILED TESTS: None ✓", "green"))
        print()

    # Brittle tests
    brittle = analysis.get("brittle_tests", [])
    if brittle:
        print(c(f"BRITTLE TESTS ({len(brittle)})", "yellow"))
        for t in brittle:
            print(f"  {c('⚠', 'yellow')} {t['name']}")
            print(f"    Suite  : {t.get('suite', '?')}")
            print(f"    Reason : {t.get('reason', '?')}")
            print(f"    Fix    : {c(t.get('recommendation', '?'), 'cyan')}")
            print()

    # Anti-patterns
    anti = analysis.get("anti_patterns", [])
    if anti:
        print(c(f"ANTI-PATTERNS ({len(anti)})", "yellow"))
        for p in anti:
            print(f"  {c('⚠', 'yellow')} [{p.get('pattern', '?')}] {p.get('suite', '?')}")
            print(f"    {p.get('details', '')}")
        print()

    # Flaky tests
    flaky = analysis.get("flaky_tests", [])
    if flaky:
        print(c(f"FLAKY TESTS ({len(flaky)})", "yellow"))
        for t in flaky:
            print(f"  {c('⚡', 'yellow')} {t['name']} — failed {t.get('fail_count_last_5', '?')}/5 recent runs")
            print(f"    Fix : {c(t.get('recommendation', '?'), 'cyan')}")
        print()

    # Suggested new test
    suggestion = analysis.get("suggested_new_test")
    if suggestion and suggestion.get("test_name"):
        print(c("SUGGESTED NEW TEST", "cyan"))
        print(f"  Name     : {suggestion['test_name']}")
        print(f"  File     : {suggestion.get('target_suite', '?')}")
        print(f"  Assert   : {suggestion.get('what_to_assert', '?')}")
        print(f"  Why      : {suggestion.get('rationale', '?')}")
        print()

    # Top priority fixes
    fixes = analysis.get("top_priority_fixes", [])
    if fixes:
        print(c("TOP PRIORITY FIXES", "bold"))
        for i, fix in enumerate(fixes, 1):
            print(f"  {i}. {fix}")
        print()

    print(c("=" * 60, "bold"))


# ─── Main ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Analyse test results using Claude AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
            Examples:
              # Analyse Jest backend results
              python ai-testing/analyse_results.py --jest reports/jest-results.json

              # Analyse Playwright results
              python ai-testing/analyse_results.py --playwright playwright-report/results.json

              # Analyse both at once
              python ai-testing/analyse_results.py \\
                --jest reports/jest-results.json \\
                --playwright playwright-report/results.json

              # Save output to a file
              python ai-testing/analyse_results.py --jest reports/jest-results.json --output reports/ai-analysis.json
        """),
    )
    parser.add_argument("--jest", type=Path, nargs="+", help="Path(s) to Jest JSON results file(s) — can pass multiple")
    parser.add_argument("--playwright", type=Path, help="Path to Playwright JSON results file")
    parser.add_argument("--history", type=Path, help="Path to run history JSON (defaults to ai-testing/run_history.json)")
    parser.add_argument("--output", type=Path, help="Save analysis JSON to this file (optional)")
    parser.add_argument("--no-save-history", action="store_true", help="Don't update run history after this run")
    args = parser.parse_args()

    # Auto-detect results if no args given
    if not args.jest and not args.playwright:
        # Find all jest-*-results.json files in reports/
        detected_jest = list(REPORTS_DIR.glob("jest-*-results.json")) + list(REPORTS_DIR.glob("jest-results.json"))
        default_pw = REPO_ROOT / "playwright-report" / "results.json"
        if detected_jest:
            args.jest = detected_jest
            for p in detected_jest:
                print(f"Auto-detected Jest results: {p}")
        if default_pw.exists():
            args.playwright = default_pw
            print(f"Auto-detected Playwright results: {default_pw}")

    if not args.jest and not args.playwright:
        print("ERROR: No test result files found. Run your tests first, then try again.")
        print("  Step 1: mkdir -p reports")
        print("  Step 2: node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.backend.config.js --json --outputFile=reports/jest-backend-results.json")
        print("  Step 3: node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.frontend.config.js --json --outputFile=reports/jest-frontend-results.json")
        print("  Step 4: node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.integration.config.js --json --outputFile=reports/jest-integration-results.json")
        print("  Step 5: npx playwright test")
        sys.exit(1)

    # Load results
    sources = []
    combined = {"results": []}

    if args.jest:
        jest_paths = args.jest if isinstance(args.jest, list) else [args.jest]
        for jest_path in jest_paths:
            jest_data = load_jest_results(jest_path)
            if jest_data:
                # Label by filename so Claude knows which suite it is
                jest_data["source"] = jest_path.stem.replace("-results", "").replace("jest-", "jest/")
                combined["results"].append(jest_data)
                sources.append(jest_data["source"])
                print(f"Loaded {jest_data['run_summary']['total_tests']} tests from {jest_path.name}")

    if args.playwright:
        pw_data = load_playwright_results(args.playwright)
        if pw_data:
            combined["results"].append(pw_data)
            sources.append("playwright")
            print(f"Loaded Playwright results: {pw_data['run_summary']['total_tests']} tests from {args.playwright}")

    # Load history
    history_path = args.history or HISTORY_PATH
    history = load_history() if history_path == HISTORY_PATH else (
        json.load(open(history_path)) if history_path.exists() else []
    )
    if history:
        print(f"Loaded {len(history)} historical runs for flaky test detection")

    # Call Claude
    analysis = call_claude(combined, history)

    # Save history
    if not args.no_save_history:
        save_to_history(analysis, sources)

    # Print report
    print_report(analysis)

    # Save output JSON if requested
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, "w") as f:
            json.dump(analysis, f, indent=2)
        print(f"\nFull analysis saved to: {args.output}")

    # Exit with failure code if tests failed (useful for CI)
    health = analysis.get("run_summary", {}).get("overall_health", "healthy")
    if health == "critical":
        sys.exit(2)
    elif health == "degraded":
        sys.exit(1)


if __name__ == "__main__":
    main()
