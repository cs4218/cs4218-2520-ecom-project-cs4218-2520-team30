/**
 * k6 scenario: mixed concurrent workload (browse, search, deep reads, orders).
 * @author Boh Xiang You Basil (A0273232M)
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import {
  API,
  TOTAL_PAGES,
  VOLUME_CATEGORY_0_SLUG,
  SEEDED_HEAVY_USER_EMAIL,
  SEEDED_HEAVY_USER_PASSWORD,
  SEEDED_ADMIN_EMAIL,
  SEEDED_ADMIN_PASSWORD,
} from "../config.js";
import { loginUser, authHeaders, randomItem, randomInt } from "../helpers.js";
import { volumeHandleSummary } from "../summaryHtml.js";

const browseDuration = new Trend("browse_duration", true);
const searchDuration = new Trend("search_duration", true);
const deepReadDuration = new Trend("deep_read_duration", true);
const orderDuration = new Trend("order_duration", true);
const mixedErrors = new Counter("mixed_errors");

const SEARCH_KEYWORDS = [
  "Premium", "Classic", "Ultra", "Mega", "Super", "Deluxe", "Pro", "Elite",
  "Widget", "Gadget", "Device", "Keyboard", "Mouse", "Monitor", "Camera",
  "wireless", "portable", "smart", "compact", "durable",
];

/** @author Boh Xiang You Basil (A0273232M) */
function pickDeepPage() {
  const tp = TOTAL_PAGES;
  if (tp < 2) return 1;
  const from = Math.max(1, Math.floor(tp * 0.4));
  return randomInt(from, tp);
}

export const options = {
  scenarios: {
    browse: {
      executor: "constant-vus",
      vus: 30,
      duration: "10m",
      exec: "browseCatalog",
      tags: { group: "browse" },
    },
    search: {
      executor: "constant-vus",
      vus: 10,
      duration: "10m",
      exec: "searchProducts",
      tags: { group: "search" },
    },
    deepReads: {
      executor: "constant-vus",
      vus: 5,
      duration: "10m",
      exec: "deepStorageReads",
      tags: { group: "deep_reads" },
    },
    orders: {
      executor: "constant-vus",
      vus: 5,
      duration: "10m",
      exec: "orderHistory",
      tags: { group: "orders" },
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<3000", "p(99)<8000"],
    http_req_failed: ["rate<0.01"],
    browse_duration: ["p(95)<2500"],
    search_duration: ["p(95)<2500"],
    deep_read_duration: ["p(95)<2500"],
    order_duration: ["p(95)<8000"],
  },
};

/** @author Boh Xiang You Basil (A0273232M) */
export function setup() {
  const heavyToken = loginUser(
    SEEDED_HEAVY_USER_EMAIL,
    SEEDED_HEAVY_USER_PASSWORD
  );
  const adminToken = loginUser(SEEDED_ADMIN_EMAIL, SEEDED_ADMIN_PASSWORD);
  return { heavyToken, adminToken };
}

/** @author Boh Xiang You Basil (A0273232M) */
export function browseCatalog() {
  const start = Date.now();

  http.get(`${API}/product/product-count`, {
    tags: { name: "GET /product/product-count", db_focus: "count" },
  });

  const page =
    Math.random() < 0.65 ? pickDeepPage() : randomInt(1, Math.max(2, Math.floor(TOTAL_PAGES * 0.15)));
  const listRes = http.get(`${API}/product/product-list/${page}`, {
    tags: { name: "GET /product/product-list/:page", db_focus: "pagination" },
  });
  if (!check(listRes, { "list 200": (r) => r.status === 200 })) {
    mixedErrors.add(1);
  }

  if (__ITER % 4 === 0) {
    http.get(`${API}/product/product-category/${VOLUME_CATEGORY_0_SLUG}`, {
      tags: { name: "GET /product/product-category/:slug", db_focus: "category" },
    });
  }

  if (listRes.status === 200) {
    try {
      const products = listRes.json().products;
      if (products && products.length > 0) {
        const p = products[randomInt(0, products.length - 1)];
        http.get(`${API}/product/get-product/${p.slug}`, {
          tags: { name: "GET /product/get-product/:slug", db_focus: "detail" },
        });
      }
    } catch (_) {
      // noop
    }
  }

  browseDuration.add(Date.now() - start);
  sleep(randomInt(1, 3));
}

/** @author Boh Xiang You Basil (A0273232M) */
export function searchProducts() {
  const start = Date.now();

  const keyword =
    __ITER % 3 === 0 ? "__volume__" : randomItem(SEARCH_KEYWORDS);
  const res = http.get(
    `${API}/product/search/${encodeURIComponent(keyword)}`,
    {
      tags: { name: "GET /product/search/:keyword", db_focus: "regex" },
    }
  );
  if (!check(res, { "search 200": (r) => r.status === 200 })) {
    mixedErrors.add(1);
  }

  searchDuration.add(Date.now() - start);
  sleep(randomInt(1, 2));
}

/**
 * Deep pagination + category + binary photo — DB / storage focused.
 * @author Boh Xiang You Basil (A0273232M)
 */
export function deepStorageReads() {
  const start = Date.now();

  const listRes = http.get(
    `${API}/product/product-list/${pickDeepPage()}`,
    { tags: { name: "GET /product/product-list/:page", db_focus: "deep_skip" } }
  );
  check(listRes, { "deep list 200": (r) => r.status === 200 });

  http.get(`${API}/product/product-category/${VOLUME_CATEGORY_0_SLUG}`, {
    tags: { name: "GET /product/product-category/:slug", db_focus: "category_all" },
  });

  if (listRes.status === 200) {
    try {
      const products = listRes.json().products;
      if (products && products.length > 0) {
        const p = products[randomInt(0, products.length - 1)];
        http.get(`${API}/product/product-photo/${p._id}`, {
          tags: { name: "GET /product/product-photo/:pid", db_focus: "photo" },
        });
      }
    } catch (_) {
      // noop
    }
  }

  deepReadDuration.add(Date.now() - start);
  sleep(randomInt(1, 2));
}

/** @author Boh Xiang You Basil (A0273232M) */
export function orderHistory(data) {
  const start = Date.now();

  if (__ITER % 2 === 0 && data.heavyToken) {
    const res = http.get(`${API}/auth/orders`, {
      headers: authHeaders(data.heavyToken),
      tags: {
        name: "GET /auth/orders (heavy)",
        db_focus: "orders_buyer",
      },
    });
    check(res, { "orders 200": (r) => r.status === 200 });
  } else if (data.adminToken) {
    const res = http.get(`${API}/auth/all-orders`, {
      headers: authHeaders(data.adminToken),
      tags: {
        name: "GET /auth/all-orders",
        db_focus: "orders_admin",
      },
    });
    check(res, { "all-orders 200": (r) => r.status === 200 });
  }

  orderDuration.add(Date.now() - start);
  sleep(1);
}

/** @author Boh Xiang You Basil (A0273232M) */
export function handleSummary(data) {
  return volumeHandleSummary(data, {
    title: "Mixed DB workload (catalog, search, deep reads, orders)",
    slug: "mixed-workload",
  });
}
