// Alek Kwek, A0273471A
// =============================================================================
// mixed-flows.js  –  Alek Kwek, A0273471A
// CS4218 MS3 Load Testing  |  Steady-State Baseline & Peak Load
// =============================================================================
//
// PURPOSE
// -------
// This script establishes two things for the MS3 report:
//   1. Steady-State Baseline  – can the backend sustain 20 concurrent users
//      for an extended period without latency creep or error rate growth?
//   2. Peak Load probe        – how does the system respond when concurrency
//      doubles to 40 VUs before returning to baseline?
//
// CONTEXT
// -------
// Teammates cover Stress (beyond capacity) and Spike (sudden surge) testing.
// This script deliberately avoids those patterns and focuses on the sustained,
// realistic load a production e-commerce site would see during business hours.
//
// =============================================================================

import http from "k6/http";
import { check, sleep } from "k6";
import {
  BASE_URL,
  checkResponse,
  jsonParams,
  loginAndGetToken,
  parseJson,
  pickFirstProduct,
  pickSearchKeyword,
  uniqueId,
} from "./helpers.js";

// =============================================================================
// OPTIONS  –  Load profile & SLAs
// =============================================================================
//
// EXTERNAL CONFIG OVERRIDE
// ------------------------
// k6's precedence order is: CLI flags > environment vars > script options.
// However, --config merges with (rather than replaces) the script-level
// `options`, so stages defined here always "win" over a JSON config file.
//
// Solution: if EXTERNAL_CONFIG=true is passed, we set options = {} so the
// --config JSON file takes full control with no interference from the script.
//
// Usage:
//   # Default 40-VU baseline (no env var needed):
//   k6 run /scripts/mixed-flows.js
//
//   # Hand off to a JSON config (e.g. 100-VU high-load scenario):
//   k6 run -e EXTERNAL_CONFIG=true \
//       --config /scripts/config.ecom-very-high-load.json \
//       /scripts/mixed-flows.js
//
export let options;

if (__ENV.EXTERNAL_CONFIG === "true") {
  // Yield full control to --config JSON; script contributes nothing.
  options = {};
} else {
  // ─── Default: 40-VU baseline + peak ───────────────────────────────────────
  //
  //   • 1-minute ramp-up avoids a thundering-herd cold start.
  //   • 5-minute steady state at 20 VUs is the primary SLA measurement window.
  //   • 40-VU plateau for 3 minutes probes peak load without stress territory.
  //   • 1-minute ramp-down lets in-flight requests complete gracefully.
  //
  options = {
    stages: [
      { duration: "1m",  target: 20 },  // ramp to baseline (20 VUs)
      { duration: "5m",  target: 20 },  // sustain baseline – primary SLA window
      { duration: "1m",  target: 40 },  // ramp to peak (40 VUs)
      { duration: "3m",  target: 40 },  // sustain peak load
      { duration: "1m",  target: 0  },  // graceful ramp-down
    ],
    thresholds: {
      http_req_failed:   ["rate<0.01"],  // < 1% errors
      http_req_duration: ["p(95)<200"],  // p95 under 200 ms (Google RAIL)
      checks:            ["rate>0.99"],  // > 99% assertion pass rate
    },
  };
}


// =============================================================================
// SETUP  –  Authenticate admin once before the test begins
// =============================================================================
//
// Using setup() ensures we obtain a single admin JWT during the initialisation
// phase. Sharing this token across VUs is acceptable here because admin reads
// are idempotent and we only need the token for the "checkout token" step.
//
export function setup() {
  const email    = __ENV.K6_ADMIN_EMAIL    || "playwright-admin@test.com";
  const password = __ENV.K6_ADMIN_PASSWORD || "adminpassword123";

  const loginResult = loginAndGetToken(email, password);

  if (!loginResult.token) {
    throw new Error(
      "Admin login failed during setup – set K6_ADMIN_EMAIL and K6_ADMIN_PASSWORD."
    );
  }

  return { adminToken: loginResult.token };
}

// =============================================================================
// THINK TIME HELPER
// =============================================================================
//
// Rationale (for report):
//   Real users don't send requests continuously. They read a page, decide what
//   to click, and then act. Modelling this "think time" is critical; without it
//   each VU hammers the server at CPU speed, generating an artificially high
//   and unrealistic request rate. A uniform distribution between 1–3 s is a
//   reasonable approximation for e-commerce browsing behaviour.
//
function thinkTime(minSeconds = 1, maxSeconds = 3) {
  sleep(minSeconds + Math.random() * (maxSeconds - minSeconds));
}

// =============================================================================
// USER JOURNEY  –  Modelled after a typical e-commerce session
// =============================================================================
//
// Flow:
//   1. Browse homepage  – GET categories + product list (anonymous)
//   2. Discover product – GET single product + related products
//   3. Search           – GET search results (simulates search bar)
//   4. Register & Login – POST register, POST login (new user each iteration
//                         to avoid duplicate-email collisions under load)
//   5. Profile check    – GET user-auth (validates JWT middleware performance)
//   6. Filter & refine  – POST product-filters (simulate category navigation)
//   7. Initiate checkout– GET braintree/token (server-side checkout setup;
//                         the actual payment POST is excluded from load tests
//                         as it depends on an external sandbox)
//
export default (data) => {
  // ── Step 1: Browse the homepage (anonymous) ──────────────────────────────
  const [categoryRes, countRes, listRes] = http.batch([
    ["GET", `${BASE_URL}/api/v1/category/get-category`],
    ["GET", `${BASE_URL}/api/v1/product/product-count`],
    ["GET", `${BASE_URL}/api/v1/product/product-list/1`],
  ]);

  checkResponse(categoryRes, "browse category-list");
  checkResponse(countRes,    "browse product-count");
  checkResponse(listRes,     "browse product-list");

  const categoryBody = parseJson(categoryRes) || {};
  const listBody     = parseJson(listRes)     || {};
  const firstProduct = pickFirstProduct(listBody);

  // Think time: user reads the landing page before clicking a product
  thinkTime(1, 2);

  if (!firstProduct) {
    // No products seeded – skip the product detail journey
    return;
  }

  // ── Step 2: View a product detail page ───────────────────────────────────
  const productDetailRes = http.get(
    `${BASE_URL}/api/v1/product/get-product/${firstProduct.slug}`
  );
  checkResponse(productDetailRes, "product detail");

  const detailBody     = parseJson(productDetailRes) || {};
  const product        = detailBody.product || firstProduct;
  const categoryId     =
    (product.category && product.category._id) ||
    (Array.isArray(categoryBody.category) && categoryBody.category[0]
      ? categoryBody.category[0]._id
      : "");

  // Fetch related products and the product photo in parallel (mirrors browser
  // behaviour where the page fires multiple requests on load)
  if (categoryId) {
    const [relatedRes, photoRes] = http.batch([
      ["GET", `${BASE_URL}/api/v1/product/related-product/${product._id}/${categoryId}`],
      ["GET", `${BASE_URL}/api/v1/product/product-photo/${product._id}`],
    ]);
    checkResponse(relatedRes, "related products");
    checkResponse(photoRes,   "product photo");
  } else {
    const photoRes = http.get(`${BASE_URL}/api/v1/product/product-photo/${product._id}`);
    checkResponse(photoRes, "product photo");
  }

  // Think time: user inspects the product, reads the description
  thinkTime(2, 3);

  // ── Step 3: Search (user types in the search bar) ────────────────────────
  const keyword    = pickSearchKeyword(product);
  const searchRes  = http.get(`${BASE_URL}/api/v1/product/search/${keyword}`);
  checkResponse(searchRes, "search");

  // Think time: user reads search results
  thinkTime(1, 2);

  // ── Step 4: Register + Login ──────────────────────────────────────────────
  //
  // A fresh email per iteration ensures the register endpoint stays exercised
  // under load without conflicting with other VUs. In production, most visits
  // would be returning users; the register path is included here because it is
  // a meaningful backend operation (bcrypt hashing) that affects p95 latency.
  //
  const suffix   = uniqueId("mixed");
  const email    = `${suffix}@loadtest.com`;
  const password = "Password123!";

  const registerRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name:    `Load Tester ${suffix}`,
      email,
      password,
      phone:   "91234567",
      address: "1 Load Test Ave, Singapore 000001",
      answer:  "Football",
    }),
    jsonParams()
  );
  checkResponse(registerRes, "register", [201]);

  const loginResult = loginAndGetToken(email, password);
  if (!loginResult.token) {
    // Login failed – skip authenticated steps and record the failure via checks
    check(null, { "login produced token": () => false });
    return;
  }

  const authParams = jsonParams(loginResult.token);

  // Think time: user lands on the dashboard after login
  thinkTime(1, 2);

  // ── Step 5: Authenticated profile check ──────────────────────────────────
  //
  // GET /user-auth validates the JWT on every page load in the real frontend.
  // Including it here measures the middleware overhead under concurrent load.
  //
  const [userAuthRes, ordersRes] = http.batch([
    ["GET", `${BASE_URL}/api/v1/auth/user-auth`, null, authParams],
    ["GET", `${BASE_URL}/api/v1/auth/orders`,    null, authParams],
  ]);
  checkResponse(userAuthRes, "user-auth");
  checkResponse(ordersRes,   "user orders");

  // Think time: user views their order history
  thinkTime(1, 2);

  // ── Step 6: Filter products by category (user refines their choice) ───────
  if (categoryId) {
    const filterRes = http.post(
      `${BASE_URL}/api/v1/product/product-filters`,
      JSON.stringify({ checked: [categoryId], radio: [] }),
      jsonParams()
    );
    checkResponse(filterRes, "product-filters");
    thinkTime(1, 2);
  }

  // ── Step 7: Initiate checkout – obtain Braintree client token ─────────────
  //
  // In the real app, clicking "Checkout" triggers GET /braintree/token to set
  // up the payment nonce. The subsequent POST /braintree/payment talks to the
  // external Braintree sandbox, so it is intentionally excluded from load
  // tests (a standard practice – external dependencies are stubbed or omitted).
  // The token endpoint is server-side only (JWT + Braintree API key) and a
  // legitimate target for load measurement.
  //
  const braintreeTokenRes = http.get(
    `${BASE_URL}/api/v1/product/braintree/token`,
    authParams
  );
  // 200 OK = server returned a client token; accept any 2xx
  check(braintreeTokenRes, {
    "checkout init status 2xx": (r) => r.status >= 200 && r.status < 300,
  });

  // Final think time before the iteration resets
   thinkTime(1, 3);
};

export function teardown() {
   console.log("\n=== Load test completed ===");
   console.log("Reminder: Clean up test data manually");
   console.log("Example: db.users.deleteMany({email: /@loadtest\\.com$/})");
}
