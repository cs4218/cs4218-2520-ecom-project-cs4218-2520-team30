/**
 * Shared k6 end-of-test HTML summary for volume scenarios.
 * Explains pass/fail clearly: thresholds drive k6 exit code, not checks.
 * @author Boh Xiang You Basil (A0273232M)
 */

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.3/index.js";

/** @author Boh Xiang You Basil (A0273232M) */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Normalize k6 threshold entries (shape differs slightly across k6 versions).
 * @author Boh Xiang You Basil (A0273232M)
 */
function collectThresholdRows(data) {
  const raw = data.thresholds;
  if (raw && typeof raw === "object" && Object.keys(raw).length > 0) {
    return Object.entries(raw).map(([name, t]) => ({
      name,
      ok: typeof t === "boolean" ? t : Boolean(t && t.ok),
    }));
  }

  // Fallback: some k6 versions attach threshold outcomes on metrics
  const rows = [];
  const metrics = data.metrics || {};
  for (const [metricName, m] of Object.entries(metrics)) {
    const th = m.thresholds;
    if (!th || typeof th !== "object") continue;
    for (const [expr, ok] of Object.entries(th)) {
      rows.push({
        name: `${metricName}{${expr}}`,
        ok: typeof ok === "boolean" ? ok : Boolean(ok && ok.ok),
      });
    }
  }
  return rows;
}

/** @author Boh Xiang You Basil (A0273232M) */
function explainThreshold(name) {
  const n = name.toLowerCase();
  if (n.includes("http_req_failed")) {
    return "Share of HTTP requests that failed (non-2xx, timeouts, etc.) must stay below this rate.";
  }
  if (n.includes("http_req_duration")) {
    if (n.includes("p(95)") || n.includes("p95")) {
      return "95% of HTTP requests must complete within this time (milliseconds). Slower tail is allowed for only 5% of requests.";
    }
    if (n.includes("p(99)") || n.includes("p99")) {
      return "99% of HTTP requests must complete within this time (milliseconds).";
    }
    return "HTTP request duration must satisfy this condition.";
  }
  if (n.includes("browse_duration")) {
    return "Custom timing for browse-style iterations (Trend metric).";
  }
  if (n.includes("search_duration")) {
    return "Custom timing for search-style iterations (Trend metric).";
  }
  if (n.includes("auth_duration")) {
    return "Custom timing for auth-style iterations (Trend metric).";
  }
  if (n.includes("deep_read_duration")) {
    return "Custom timing for deep pagination + category + photo read iterations (Trend metric).";
  }
  if (n.includes("order_duration")) {
    return "Custom timing for order-history iterations (Trend metric).";
  }
  return "k6 evaluated this expression against collected metrics. If it reads false, the run fails.";
}

/** @author Boh Xiang You Basil (A0273232M) */
function buildMetricsTable(data) {
  const metrics = data.metrics || {};
  return Object.entries(metrics)
    .map(([name, m]) => {
      const vals = m.values || {};
      const fmt = (v) =>
        v != null && typeof v === "number" ? v.toFixed(2) : "-";
      return `<tr>
        <td>${escapeHtml(name)}</td>
        <td>${fmt(vals.avg)}</td>
        <td>${fmt(vals.med)}</td>
        <td>${fmt(vals["p(90)"])}</td>
        <td>${fmt(vals["p(95)"])}</td>
        <td>${fmt(vals["p(99)"])}</td>
        <td>${fmt(vals.max)}</td>
        <td>${
          vals.count != null
            ? vals.count
            : vals.rate != null
              ? vals.rate.toFixed(4)
              : "-"
        }</td>
      </tr>`;
    })
    .join("\n");
}

/**
 * Full HTML document for one scenario run.
 * @author Boh Xiang You Basil (A0273232M)
 */
export function volumeHtmlReport(data, scenarioTitle) {
  const thresholdRows = collectThresholdRows(data);
  const allOk =
    thresholdRows.length === 0
      ? null
      : thresholdRows.every((r) => r.ok);
  const anyFail = thresholdRows.length > 0 && thresholdRows.some((r) => !r.ok);

  let bannerClass = "banner-unknown";
  let bannerTitle = "Result unclear";
  let bannerDetail =
    "No threshold results were found in the summary payload. Check the k6 version and that the test finished normally; the CLI summary still applies.";

  if (thresholdRows.length > 0) {
    if (allOk) {
      bannerClass = "banner-pass";
      bannerTitle = "OVERALL: PASS";
      bannerDetail =
        "Every configured threshold passed. k6 exits with code 0 for this scenario.";
    } else if (anyFail) {
      bannerClass = "banner-fail";
      bannerTitle = "OVERALL: FAIL";
      bannerDetail =
        "At least one threshold failed. k6 exits with a non-zero code — see the red rows below and the terminal output for details.";
    }
  }

  const thTable =
    thresholdRows.length === 0
      ? `<p class="note">No threshold rows to display. See terminal <code>k6 run</code> output for threshold pass/fail lines (marked ✓ / ✗).</p>`
      : `<table class="thresholds">
        <thead>
          <tr>
            <th>Threshold (k6 expression)</th>
            <th>What it means</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${thresholdRows
            .map(
              (r) => `<tr class="${r.ok ? "row-ok" : "row-bad"}">
            <td><code>${escapeHtml(r.name)}</code></td>
            <td>${escapeHtml(explainThreshold(r.name))}</td>
            <td class="cell-result ${r.ok ? "pass" : "fail"}">${r.ok ? "PASS" : "FAIL"}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>`;

  const metricsRows = buildMetricsTable(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(scenarioTitle)} — Virtual Vault volume test</title>
  <style>
    :root { --border: #ccc; --muted: #555; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 1.5rem 2rem; max-width: 1200px; line-height: 1.45; color: #111; }
    h1 { font-size: 1.35rem; margin-top: 0; }
    h2 { font-size: 1.05rem; margin-top: 1.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35rem; }
    .banner { padding: 1rem 1.25rem; border-radius: 8px; margin: 1rem 0 1.5rem; border: 1px solid transparent; }
    .banner-pass { background: #e8f5e9; border-color: #a5d6a7; }
    .banner-fail { background: #ffebee; border-color: #ef9a9a; }
    .banner-unknown { background: #fff8e1; border-color: #ffe082; }
    .banner h2 { margin: 0 0 0.5rem 0; font-size: 1.25rem; border: none; padding: 0; }
    .banner p { margin: 0; color: var(--muted); font-size: 0.95rem; }
    .legend { background: #f5f5f5; padding: 0.85rem 1rem; border-radius: 6px; font-size: 0.9rem; color: var(--muted); margin-bottom: 1rem; }
    .legend strong { color: #111; }
    .legend ul { margin: 0.4rem 0 0 1.2rem; padding: 0; }
    table { border-collapse: collapse; width: 100%; font-size: 0.88rem; }
    th, td { border: 1px solid var(--border); padding: 8px 10px; text-align: right; vertical-align: top; }
    th { background: #f0f0f0; text-align: left; }
    td:first-child { text-align: left; }
    code { font-size: 0.82rem; word-break: break-all; }
    .pass { color: #1b5e20; font-weight: 700; }
    .fail { color: #b71c1c; font-weight: 700; }
    .row-ok { background: #fafafa; }
    .row-bad { background: #fff5f5; }
    .cell-result { text-align: center; font-weight: 700; }
    .note { color: var(--muted); font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(scenarioTitle)}</h1>

  <div class="banner ${bannerClass}">
    <h2>${escapeHtml(bannerTitle)}</h2>
    <p>${escapeHtml(bannerDetail)}</p>
  </div>

  <div class="legend">
    <strong>How to read this report</strong>
    <ul>
      <li><strong>Pass or fail</strong> is decided only by <em>thresholds</em> (the table below). That matches how <code>k6</code> sets its exit code (0 = all thresholds passed).</li>
      <li><strong>Checks</strong> inside the script (e.g. “status is 200”) appear in metrics as <code>checks</code>; they help you debug but do not fail the run unless tied to a threshold.</li>
      <li>Use the <strong>Metrics</strong> section for response times (e.g. <code>http_req_duration</code>), throughput (<code>http_reqs</code>), and errors (<code>http_req_failed</code>). Under load, these reflect <strong>database query time, document retrieval, and response size</strong> (not just network).</li>
      <li><strong>Server-side DB memory / cache / disk</strong> are not shown here. During a run, use MongoDB tools (e.g. <code>mongostat</code>, Compass, or Atlas metrics) alongside this report.</li>
    </ul>
  </div>

  <h2>Thresholds (pass / fail criteria)</h2>
  ${thTable}

  <h2>All metrics</h2>
  <table>
    <thead>
      <tr>
        <th>Metric</th><th>Avg</th><th>Med</th><th>p90</th><th>p95</th><th>p99</th><th>Max</th><th>Count / rate</th>
      </tr>
    </thead>
    <tbody>${metricsRows}</tbody>
  </table>
</body>
</html>`;
}

/**
 * Standard handleSummary return object: stdout + HTML + JSON.
 * @author Boh Xiang You Basil (A0273232M)
 */
export function volumeHandleSummary(data, { title, slug }) {
  const base = `tests/volume/results/${slug}-summary`;
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [`${base}.html`]: volumeHtmlReport(data, title),
    [`${base}.json`]: JSON.stringify(data),
  };
}
