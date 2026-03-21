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


def call_claude(payload: dict, history: list) -> dict:
    """Send test results to Claude and return the parsed JSON analysis."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set.")
        print("Get a key at https://console.anthropic.com and then run:")
        print("  export ANTHROPIC_API_KEY='sk-ant-...'")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    system_prompt = load_system_prompt()

    user_content = f"Analyse these test results:\n\n{json.dumps(payload, indent=2)}"
    if history:
        user_content += f"\n\nHistorical data from last {len(history)} runs:\n{json.dumps(history, indent=2)}"
    else:
        user_content += "\n\nNo historical data available for flaky test detection yet."

    print("Sending results to Claude for analysis...")
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_content}],
    )

    raw_text = response.content[0].text.strip()
    return json.loads(raw_text)


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
    parser.add_argument("--jest", type=Path, help="Path to Jest JSON results file")
    parser.add_argument("--playwright", type=Path, help="Path to Playwright JSON results file")
    parser.add_argument("--history", type=Path, help="Path to run history JSON (defaults to ai-testing/run_history.json)")
    parser.add_argument("--output", type=Path, help="Save analysis JSON to this file (optional)")
    parser.add_argument("--no-save-history", action="store_true", help="Don't update run history after this run")
    args = parser.parse_args()

    # Auto-detect results if no args given
    if not args.jest and not args.playwright:
        default_jest = REPORTS_DIR / "jest-results.json"
        default_pw = REPO_ROOT / "playwright-report" / "results.json"
        if default_jest.exists():
            args.jest = default_jest
            print(f"Auto-detected Jest results: {default_jest}")
        if default_pw.exists():
            args.playwright = default_pw
            print(f"Auto-detected Playwright results: {default_pw}")

    if not args.jest and not args.playwright:
        print("ERROR: No test result files found. Run your tests first, then try again.")
        print("  Jest:       npm run test:backend -- --json --outputFile=reports/jest-results.json")
        print("  Playwright: npx playwright test --reporter=json > playwright-report/results.json")
        sys.exit(1)

    # Load results
    sources = []
    combined = {"results": []}

    if args.jest:
        jest_data = load_jest_results(args.jest)
        if jest_data:
            combined["results"].append(jest_data)
            sources.append("jest")
            print(f"Loaded Jest results: {jest_data['run_summary']['total_tests']} tests from {args.jest}")

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
