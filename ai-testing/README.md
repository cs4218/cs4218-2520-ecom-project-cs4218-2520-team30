# AI-Driven Test Result Analyser

An AI agent that reads Jest and Playwright test results, detects issues using Claude, and produces a structured analysis report.

## What It Does

After your tests run, this tool sends the results to Claude (an AI model) with instructions to:
1. **Classify failures** — tells you *why* each test failed (assertion error, timeout, setup issue, etc.)
2. **Detect brittle tests** — finds tests with hard-coded values, over-specification, fragile assertions
3. **Find anti-patterns** — duplicate test names, incomplete suites, tests with no assertions
4. **Track flaky tests** — tests that flip between passing and failing across multiple CI runs
5. **Suggest new tests** — proposes one high-value test case that's missing from your suite

## Quick Start

### 1. Install Python dependency

```bash
pip install anthropic
```

### 2. Get an Anthropic API key

Sign up at [console.anthropic.com](https://console.anthropic.com), create an API key, and set it as an environment variable:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Run your tests with JSON output

```bash
# Backend/integration tests
node --experimental-vm-modules node_modules/jest/bin/jest.js \
  --config jest.backend.config.js \
  --json --outputFile=reports/jest-results.json

# Or integration tests
node --experimental-vm-modules node_modules/jest/bin/jest.js \
  --config jest.integration.config.js \
  --json --outputFile=reports/jest-integration-results.json

# Playwright UI tests (already outputs JSON in CI)
npx playwright test --reporter=json,html
```

### 4. Run the analyser

```bash
# Auto-detect results files
python ai-testing/analyse_results.py

# Specify files explicitly
python ai-testing/analyse_results.py \
  --jest reports/jest-results.json \
  --playwright playwright-report/results.json

# Save analysis to file too
python ai-testing/analyse_results.py \
  --jest reports/jest-results.json \
  --output reports/ai-analysis.json
```

## Example Output

```
============================================================
  AI TEST RESULT ANALYSIS
============================================================

SUMMARY
  Total Tests : 147
  Passed      : 143
  Failed      : 3
  Skipped     : 1
  Duration    : 18.4s
  Health      : DEGRADED
  Reason      : 3 tests failing; 1 brittle test with hard-coded ID detected

FAILED TESTS (3)
  ✗ categoryController > should return 500 if database throws
    Suite   : controllers/categoryController.test.js
    Type    : assertion_error
    Error   : Expected: 500, Received: 200
    Fix     : Mock mongoose to throw before calling the controller

  ...

TOP PRIORITY FIXES
  1. Fix categoryController test mock — ensure error handler returns 500
  2. Replace hard-coded MongoDB ObjectId with dynamic test fixture  
  3. Mock bcrypt.compare in authController to prevent timeout
```

## Files in This Directory

| File | Purpose |
|------|---------|
| `analyse_results.py` | Main script — run this |
| `system_prompt.txt` | Instructions given to Claude (the AI "brain") |
| `sample-output.json` | Example Claude analysis output |
| `run_history.json` | Auto-generated; stores past run data for flaky detection |
| `n8n-workflow.json` | Exported n8n workflow for the automated CI pipeline |

## Architecture

```
Your Tests Run (Jest/Playwright)
          │
          ▼
  JSON Results File
          │
          ▼
  analyse_results.py
          │
          ├── loads system_prompt.txt
          ├── loads run_history.json (past runs)
          │
          ▼
   Claude API (claude-opus-4-5)
          │
          ▼
  Structured JSON Analysis
          │
          ├── Printed to terminal (colour-coded)
          ├── Saved to --output file (optional)
          └── Updates run_history.json (flaky detection)
```

## Automated Pipeline (n8n — MS3)

For the full automated version, the pipeline is triggered by GitHub Actions:

```
GitHub Push/PR
      │
      ▼ (GitHub Actions CI runs)
Jest + Playwright results saved as CI artifacts
      │
      ▼ (webhook)
n8n Workflow receives run ID
      │
      ├── Fetches JSON artifact from GitHub API
      ├── Calls Claude API with system_prompt.txt instructions
      │
      ▼
  Structured analysis
      │
      ├── Posted as GitHub PR comment
      └── Saved to history for flaky detection
```

See `n8n-workflow.json` for the importable n8n workflow file.

## Cost Estimate

Claude API usage is pay-as-you-go. Each analysis run uses approximately:
- Input: ~3,000–8,000 tokens (test results + system prompt)
- Output: ~800–1,500 tokens (analysis JSON)

Estimated cost: **~$0.02–0.05 USD per run** with claude-opus-4-5.
Running 50 times over the semester ≈ $1–3 USD total.
