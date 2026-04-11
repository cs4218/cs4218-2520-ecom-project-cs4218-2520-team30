/**
 * Volume / k6 load-test configuration (thresholds, stages, seeded constants).
 * @author Boh Xiang You Basil (A0273232M)
 */
export const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
export const API = `${BASE_URL}/api/v1`;

// --- Default thresholds (pass / fail criteria) ---
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ["p(95)<2000", "p(99)<5000"],
  http_req_failed: ["rate<0.01"],
};

export const POST_THRESHOLDS = {
  http_req_duration: ["p(95)<3000", "p(99)<5000"],
  http_req_failed: ["rate<0.01"],
};

// --- Reusable stage profiles ---
/** @author Boh Xiang You Basil (A0273232M) */
export function sustainedStages(targetVUs, holdSeconds = 300) {
  return [
    { duration: "30s", target: targetVUs },
    { duration: `${holdSeconds}s`, target: targetVUs },
    { duration: "30s", target: 0 },
  ];
}

/** @author Boh Xiang You Basil (A0273232M) */
export function spikeStages(targetVUs, holdSeconds = 60) {
  return [
    { duration: "15s", target: targetVUs * 2 },
    { duration: `${holdSeconds}s`, target: targetVUs * 2 },
    { duration: "15s", target: targetVUs },
    { duration: "30s", target: 0 },
  ];
}

// --- Seeded data constants (must match seed-data.js) ---
export const VOLUME_PREFIX = "__volume__";
export const SEEDED_USER_PASSWORD = "password123";
export const SEEDED_ADMIN_EMAIL = "__volume__admin@admin.com";
export const SEEDED_ADMIN_PASSWORD = "password123";
export const SEEDED_HEAVY_USER_EMAIL = "__volume__heavyuser@test.com";
export const SEEDED_HEAVY_USER_PASSWORD = "password123";
/** Slug for `__volume__ Category 0` from seed-data.js (slugify). */
export const VOLUME_CATEGORY_0_SLUG = "__volume__-category-0";
export const TOTAL_PRODUCTS = 8000;
export const TOTAL_CATEGORIES = 20;
export const PRODUCTS_PER_PAGE = 6;
export const TOTAL_PAGES = Math.ceil(TOTAL_PRODUCTS / PRODUCTS_PER_PAGE);
