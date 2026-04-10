// =============================================================================
// bottleneck-stress.js  –  Alek Kwek, A0273471A
// CS4218 MS3 Load Testing  |  Targeted Bottleneck Stress Test
// =============================================================================
//
// PURPOSE
// -------
// This script deliberately hammers the five specific code paths identified as
// performance bottlenecks in the backend analysis:
//
//   1. PHOTO    – GET /product/product-photo/:pid
//                 Each call fetches a full MongoDB document containing a raw
//                 binary Buffer. No CDN, no static serving — pure DB read per
//                 request. Expect memory and latency pressure under concurrency.
//
//   2. SEARCH   – GET /product/search/:keyword
//                 Uses $regex with no index: MongoDB performs a full collection
//                 scan on both `name` and `description` fields per request.
//
//   3. REGISTER – POST /auth/register  (bcrypt pressure)
//                 bcrypt.hash with saltRounds=10 burns ~100ms of CPU per call.
//                 Under 30 concurrent VUs this queues behind Node's event loop.
//
//   4. ADMIN    – GET /auth/admin-auth + GET /auth/all-orders
//                 isAdmin middleware does a DB lookup on every request (token
//                 already contains _id but role is re-fetched). all-orders
//                 returns unbounded results — no limit() clause.
//
//   5. PROFILE  – PUT /auth/profile
//                 Issues two sequential DB queries per update: one findById then
//                 one findByIdAndUpdate on the same document.
//
// DESIGN
// ------
// Each bottleneck runs as an independent named scenario with its own VU pool,
// so regressions are visible per-scenario rather than buried in aggregate stats.
// Think time is removed (or minimal) to generate maximum CPU/IO pressure.
//
// USAGE
// -----
//   # Run all scenarios (default profile):
//   k6 run k6/bottleneck-stress.js
//
//   # Target a specific scenario only:
//   k6 run --env SCENARIO=photo k6/bottleneck-stress.js
//
//   # Override base URL:
//   k6 run --env K6_BASE_URL=http://localhost:6060 k6/bottleneck-stress.js
//
// =============================================================================

import http from "k6/http";
import { check, sleep } from "k6";
import {
  BASE_URL,
  jsonParams,
  loginAndGetToken,
  parseJson,
  uniqueId,
} from "./helpers.js";

// =============================================================================
// SCENARIO REGISTRY
// =============================================================================
//
// Each scenario maps to an exported function below. The VU counts are chosen
// to pressure the specific bottleneck without overwhelming the whole stack.
//
// Ramp profile per scenario:
//   - 30s warm-up  → avoid cold-start bias in measurements
//   - 2m sustained → primary measurement window
//   - 30s ramp-down
//
const ALL_SCENARIOS = {
  // ── 1. Photo serving (MongoDB binary blob) ─────────────────────────────────
  // High concurrency because this is a read-heavy path. 60 VUs with no sleep
  // simulates a product listing page loading all thumbnails in parallel.
  photo: {
    executor: "ramping-vus",
    exec: "photoScenario",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 30 },
      { duration: "2m",  target: 60 },
      { duration: "30s", target: 0  },
    ],
    gracefulRampDown: "10s",
    tags: { scenario: "photo" },
  },

  // ── 2. Regex search (unindexed full collection scan) ───────────────────────
  // Moderate concurrency. Each request hits both name+description with $regex.
  // 30 VUs is enough to saturate a collection scan on commodity hardware.
  search: {
    executor: "ramping-vus",
    exec: "searchScenario",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 15 },
      { duration: "2m",  target: 30 },
      { duration: "30s", target: 0  },
    ],
    gracefulRampDown: "10s",
    tags: { scenario: "search" },
  },

  // ── 3. bcrypt pressure (register path) ────────────────────────────────────
  // Lower VU count because bcrypt is synchronous CPU work. 20 VUs creates a
  // queue that forces the event loop to serialize hashing operations.
  register: {
    executor: "ramping-vus",
    exec: "registerScenario",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 10 },
      { duration: "2m",  target: 20 },
      { duration: "30s", target: 0  },
    ],
    gracefulRampDown: "10s",
    tags: { scenario: "register" },
  },

  // ── 4. isAdmin DB call + unbounded all-orders ──────────────────────────────
  // Uses a shared admin token (set in setup) to exercise the per-request
  // DB lookup in isAdmin middleware and the unpaginated all-orders query.
  admin: {
    executor: "ramping-vus",
    exec: "adminScenario",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 15 },
      { duration: "2m",  target: 30 },
      { duration: "30s", target: 0  },
    ],
    gracefulRampDown: "10s",
    tags: { scenario: "admin" },
  },

  // ── 5. Double DB query on profile update ──────────────────────────────────
  // Each VU registers once, then hammers profile updates. Exercises the
  // findById + findByIdAndUpdate double-query pattern.
  profile: {
    executor: "ramping-vus",
    exec: "profileScenario",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 10 },
      { duration: "2m",  target: 20 },
      { duration: "30s", target: 0  },
    ],
    gracefulRampDown: "10s",
    tags: { scenario: "profile" },
  },
};

// Allow running a single scenario via SCENARIO env var for focused testing.
const scenarioFilter = __ENV.SCENARIO;
const activeScenarios = scenarioFilter
  ? Object.fromEntries(
      Object.entries(ALL_SCENARIOS).filter(([key]) => key === scenarioFilter)
    )
  : ALL_SCENARIOS;

if (Object.keys(activeScenarios).length === 0) {
  throw new Error(
    `SCENARIO="${scenarioFilter}" did not match any scenario. ` +
    `Valid values: ${Object.keys(ALL_SCENARIOS).join(", ")}`
  );
}

// =============================================================================
// OPTIONS
// =============================================================================

export const options = {
  scenarios: activeScenarios,

  // Per-scenario thresholds use the scenario tag injected above.
  thresholds: {
    // Global gates — if anything breaks hard these catch it.
    http_req_failed:   ["rate<0.05"],   // < 5% errors (more lenient — this is stress)
    checks:            ["rate>0.90"],   // > 90% assertion pass rate

    // Scenario-specific latency targets (tighter for reads, looser for writes).
    "http_req_duration{scenario:photo}":    ["p(95)<500"],
    "http_req_duration{scenario:search}":   ["p(95)<800"],
    "http_req_duration{scenario:register}": ["p(95)<3000"],  // bcrypt is slow by design
    "http_req_duration{scenario:admin}":    ["p(95)<500"],
    "http_req_duration{scenario:profile}":  ["p(95)<500"],

    // Per-scenario error rates.
    "http_req_failed{scenario:photo}":    ["rate<0.01"],
    "http_req_failed{scenario:search}":   ["rate<0.01"],
    "http_req_failed{scenario:register}": ["rate<0.02"],
    "http_req_failed{scenario:admin}":    ["rate<0.01"],
    "http_req_failed{scenario:profile}":  ["rate<0.01"],
  },
};

// =============================================================================
// SETUP — runs once before all VUs start
// =============================================================================
//
// Fetches a product ID and admin token that are shared across VU iterations.
// We do this in setup() so VUs don't race to discover these values concurrently.
//
export function setup() {
  // ── Admin token ─────────────────────────────────────────────────────────────
  const adminEmail    = __ENV.K6_ADMIN_EMAIL    || "playwright-admin@test.com";
  const adminPassword = __ENV.K6_ADMIN_PASSWORD || "adminpassword123";
  const adminResult   = loginAndGetToken(adminEmail, adminPassword);

  if (!adminResult.token) {
    throw new Error(
      "Admin login failed in setup(). " +
      "Ensure K6_ADMIN_EMAIL and K6_ADMIN_PASSWORD are set to a valid admin account."
    );
  }

  // ── First product (for photo + search scenarios) ────────────────────────────
  // Try product-list first, fall back to get-product (different endpoints,
  // same data). If neither has products the photo scenario will skip gracefully
  // rather than aborting the whole run.
  let firstProduct = null;

  const listRes  = http.get(`${BASE_URL}/api/v1/product/product-list/1`);
  const listBody = parseJson(listRes) || {};
  const products = Array.isArray(listBody.products) ? listBody.products : [];
  firstProduct = products[0] || null;

  if (!firstProduct) {
    // Fallback: try get-product which returns all products
    const allRes  = http.get(`${BASE_URL}/api/v1/product/get-product`);
    const allBody = parseJson(allRes) || {};
    const allProducts = Array.isArray(allBody.products) ? allBody.products : [];
    firstProduct = allProducts[0] || null;
  }

  if (!firstProduct) {
    console.warn(
      "WARNING: No products found in the database. " +
      "photo scenario will be skipped. " +
      "Seed at least one product to test photo serving."
    );
  }

  // ── Regular user token (for profile scenario warm-up) ──────────────────────
  // We pre-register one long-lived user for the profile scenario to avoid
  // paying the bcrypt cost twice per VU iteration in that scenario.
  const profileEmail    = `profile-warmup-${Date.now()}@loadtest.com`;
  const profilePassword = "Password123!";

  http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name:    "Profile Warmup User",
      email:   profileEmail,
      password: profilePassword,
      phone:   "91234567",
      address: "1 Test Ave",
      answer:  "Football",
    }),
    jsonParams()
  );

  const profileResult = loginAndGetToken(profileEmail, profilePassword);

  return {
    adminToken:    adminResult.token,
    productId:     firstProduct ? firstProduct._id   : null,
    productName:   firstProduct ? firstProduct.name  : "",
    profileToken:  profileResult.token || "",
    profileEmail,
  };
}

// =============================================================================
// SCENARIO 1 — Photo serving
// =============================================================================
//
// Hits GET /product/product-photo/:pid with no sleep. Each call causes MongoDB
// to load the full product document (including the photo Buffer) and stream the
// binary back. Under 60 concurrent VUs this saturates the Mongo connection pool
// and Node's response queue.
//
export function photoScenario(data) {
  if (!data.productId) {
    check(null, { "photo: product seeded": () => false });
    return;
  }
  const res = http.get(`${BASE_URL}/api/v1/product/product-photo/${data.productId}`);

  check(res, {
    "photo status 200":     (r) => r.status === 200,
    "photo has body":       (r) => r.body && r.body.length > 0,
    "photo under 500ms":    (r) => r.timings.duration < 500,
  });

  // No sleep — deliberate. We want to find the saturation point.
}

// =============================================================================
// SCENARIO 2 — Regex search (unindexed)
// =============================================================================
//
// Fires GET /product/search/:keyword. The backend runs:
//   { $or: [ { name: { $regex: keyword, $options: "i" } },
//             { description: { $regex: keyword, $options: "i" } } ] }
//
// A case-insensitive $regex with no text index is a full collection scan.
// We rotate through short, common keywords to avoid query-result caching effects.
//
const SEARCH_KEYWORDS = ["phone", "book", "shirt", "laptop", "watch", "bag", "shoe", "lamp"];

export function searchScenario(data) {
  // Pick a keyword derived from the real product name plus a few generic ones.
  const productFirstWord = data.productName.split(/\s+/)[0] || "product";
  const pool = [productFirstWord, ...SEARCH_KEYWORDS];
  const keyword = encodeURIComponent(pool[Math.floor(Math.random() * pool.length)]);

  const res = http.get(`${BASE_URL}/api/v1/product/search/${keyword}`);

  check(res, {
    "search status 200":    (r) => r.status === 200,
    "search under 800ms":   (r) => r.timings.duration < 800,
  });

  // Minimal sleep — simulate a user typing then waiting for results.
  sleep(0.2);
}

// =============================================================================
// SCENARIO 3 — bcrypt registration pressure
// =============================================================================
//
// Each VU creates a unique user per iteration. bcrypt.hash(password, 10) takes
// ~100ms of synchronous CPU. Under 20 concurrent VUs this queues work behind
// Node's event loop. Watch for p95 latency creeping past 1s and the event loop
// lag showing up in response time variance (max vs p99 divergence).
//
export function registerScenario() {
  const suffix   = uniqueId("stress");
  const email    = `${suffix}@loadtest.com`;
  const password = "Password123!";

  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name:    `Stress Tester ${suffix}`,
      email,
      password,
      phone:   "91234567",
      address: "1 Stress Test Rd",
      answer:  "Football",
    }),
    jsonParams()
  );

  check(res, {
    "register status 201":   (r) => r.status === 201,
    "register under 3000ms": (r) => r.timings.duration < 3000,
  });

  // No sleep — maximise concurrent bcrypt calls.
}

// =============================================================================
// SCENARIO 4 — Admin: isAdmin DB call + unbounded all-orders
// =============================================================================
//
// Uses the shared admin token from setup(). Each iteration:
//   GET /auth/admin-auth  → isAdmin middleware does a DB lookup (redundant, JWT
//                           already contains _id — role should live in the token)
//   GET /auth/all-orders  → returns ALL orders with no limit() or pagination
//
// Under 30 VUs these two queries compete for Mongo connections. The all-orders
// payload grows linearly with order volume, amplifying the memory pressure.
//
export function adminScenario(data) {
  const adminParams = jsonParams(data.adminToken);

  const [authRes, ordersRes] = http.batch([
    ["GET", `${BASE_URL}/api/v1/auth/admin-auth`,  null, adminParams],
    ["GET", `${BASE_URL}/api/v1/auth/all-orders`,  null, adminParams],
  ]);

  check(authRes, {
    "admin-auth status 200":   (r) => r.status === 200,
    "admin-auth under 500ms":  (r) => r.timings.duration < 500,
  });

  check(ordersRes, {
    "all-orders status 200":   (r) => r.status === 200,
    "all-orders under 500ms":  (r) => r.timings.duration < 500,
  });

  // Minimal sleep — admin dashboards auto-refresh every few seconds.
  sleep(0.5);
}

// =============================================================================
// SCENARIO 5 — Profile update double DB query
// =============================================================================
//
// Each VU iteration calls PUT /auth/profile which internally does:
//   1. userModel.findById(req.user._id)       ← read
//   2. userModel.findByIdAndUpdate(...)        ← write
//
// Both hit the same document. Under 20 VUs this doubles the read load on the
// users collection and causes write contention on individual documents when
// VUs share the same pre-registered test user (profileToken from setup).
//
// Note: all VUs share the single profileToken so they write to the same document,
// which maximises write contention and forces MongoDB to serialize the updates.
//
export function profileScenario(data) {
  if (!data.profileToken) {
    // Token unavailable (registration failed in setup) — skip and record.
    check(null, { "profile token available": () => false });
    return;
  }

  const authParams = jsonParams(data.profileToken);
  const suffix     = uniqueId("upd");

  const res = http.put(
    `${BASE_URL}/api/v1/auth/profile`,
    JSON.stringify({
      name:    `Updated User ${suffix}`,
      address: `${Math.floor(Math.random() * 999) + 1} Updated St`,
      phone:   `9${Math.floor(Math.random() * 9000000) + 1000000}`,
    }),
    authParams
  );

  check(res, {
    "profile status 200":    (r) => r.status === 200,
    "profile under 500ms":   (r) => r.timings.duration < 500,
  });

  // No sleep — maximise concurrent writes to the same document.
}

// =============================================================================
// TEARDOWN
// =============================================================================

export function teardown(data) {
  console.log("\n=== Bottleneck stress test completed ===");
  console.log(`Profile test user: ${data.profileEmail}`);
  console.log("Clean up test users:");
  console.log("  db.users.deleteMany({ email: /@loadtest\\.com$/ })");
  console.log(`  db.users.deleteOne({ email: "${data.profileEmail}" })`);
}
