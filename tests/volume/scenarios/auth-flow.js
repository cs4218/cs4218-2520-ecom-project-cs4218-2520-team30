/**
 * k6 scenario: deep pagination & storage reads (script name: auth-flow.js).
 * @author Boh Xiang You Basil (A0273232M)
 */
import http from "k6/http";
import { check, sleep } from "k6";
import {
  API,
  DEFAULT_THRESHOLDS,
  sustainedStages,
  TOTAL_PAGES,
  VOLUME_CATEGORY_0_SLUG,
} from "../config.js";
import { randomInt } from "../helpers.js";
import { volumeHandleSummary } from "../summaryHtml.js";

/**
 * File name kept as auth-flow.js for the orchestrator.
 * Scenario: repeated heavy read patterns (count, deep pagination, category blob, binary photo)
 * to stress DB + storage retrieval — not user registration.
 */
export const options = {
  stages: sustainedStages(25, 180),
  thresholds: DEFAULT_THRESHOLDS,
  tags: { scenario: "auth-flow" },
};

/** @author Boh Xiang You Basil (A0273232M) */
function deepPage() {
  const tp = TOTAL_PAGES;
  if (tp < 2) return 1;
  const from = Math.max(1, Math.floor(tp * 0.55));
  return randomInt(from, tp);
}

/** @author Boh Xiang You Basil (A0273232M) */
export default function () {
  http.get(`${API}/product/product-count`, {
    tags: { name: "GET /product/product-count", db_focus: "count" },
  });

  const page = deepPage();
  const listRes = http.get(`${API}/product/product-list/${page}`, {
    tags: { name: "GET /product/product-list/:page", db_focus: "deep_skip" },
  });
  check(listRes, { "list 200": (r) => r.status === 200 });

  http.get(`${API}/product/product-category/${VOLUME_CATEGORY_0_SLUG}`, {
    tags: { name: "GET /product/product-category/:slug", db_focus: "category_all" },
  });

  if (listRes.status === 200) {
    try {
      const products = listRes.json().products;
      if (products && products.length > 0) {
        const p = products[randomInt(0, products.length - 1)];
        http.get(`${API}/product/product-photo/${p._id}`, {
          tags: { name: "GET /product/product-photo/:pid", db_focus: "photo_read" },
        });
      }
    } catch (_) {
      // noop
    }
  }

  sleep(randomInt(1, 2));
}

/** @author Boh Xiang You Basil (A0273232M) */
export function handleSummary(data) {
  return volumeHandleSummary(data, {
    title: "Deep pagination & storage reads (same script path: auth-flow.js)",
    slug: "auth-flow",
  });
}
