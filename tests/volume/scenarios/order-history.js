/**
 * k6 scenario: order history (heavy user + admin all-orders).
 * @author Boh Xiang You Basil (A0273232M)
 */
import http from "k6/http";
import { check, sleep } from "k6";
import {
  API,
  sustainedStages,
  SEEDED_HEAVY_USER_EMAIL,
  SEEDED_HEAVY_USER_PASSWORD,
  SEEDED_ADMIN_EMAIL,
  SEEDED_ADMIN_PASSWORD,
} from "../config.js";
import { loginUser, authHeaders } from "../helpers.js";
import { volumeHandleSummary } from "../summaryHtml.js";

let heavyToken = null;
let adminToken = null;

export const options = {
  stages: sustainedStages(15, 180),
  thresholds: {
    // Large populated order lists (thousands of orders) — allow higher tail latency
    http_req_duration: ["p(95)<8000", "p(99)<20000"],
    http_req_failed: ["rate<0.01"],
  },
  tags: { scenario: "order-history" },
};

/** @author Boh Xiang You Basil (A0273232M) */
export function setup() {
  const ht = loginUser(SEEDED_HEAVY_USER_EMAIL, SEEDED_HEAVY_USER_PASSWORD);
  const at = loginUser(SEEDED_ADMIN_EMAIL, SEEDED_ADMIN_PASSWORD);
  if (!ht) console.warn("Heavy user login failed — check seed data.");
  if (!at) console.warn("Admin login failed — check seed data.");
  return { heavyToken: ht, adminToken: at };
}

/** @author Boh Xiang You Basil (A0273232M) */
export default function (data) {
  heavyToken = data.heavyToken;
  adminToken = data.adminToken;

  // Alternate between heavy-user orders and admin all-orders
  if (__ITER % 2 === 0 && heavyToken) {
    const ordersRes = http.get(`${API}/auth/orders`, {
      headers: authHeaders(heavyToken),
      tags: {
        name: "GET /auth/orders (heavy)",
        db_focus: "buyer_orders_populate",
      },
    });
    check(ordersRes, { "orders 200": (r) => r.status === 200 });
  } else if (adminToken) {
    const allRes = http.get(`${API}/auth/all-orders`, {
      headers: authHeaders(adminToken),
      tags: {
        name: "GET /auth/all-orders",
        db_focus: "admin_all_orders_scan",
      },
    });
    check(allRes, { "all-orders 200": (r) => r.status === 200 });
  }

  sleep(1);
}

/** @author Boh Xiang You Basil (A0273232M) */
export function handleSummary(data) {
  return volumeHandleSummary(data, {
    title: "Order data retrieval (large buyer history + admin full list)",
    slug: "order-history",
  });
}
