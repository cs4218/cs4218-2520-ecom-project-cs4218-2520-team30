/**
 * k6 scenario: catalog browsing (pagination, categories, photos, related).
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

export const options = {
  stages: sustainedStages(50, 300),
  thresholds: DEFAULT_THRESHOLDS,
  tags: { scenario: "browse-catalog" },
};

/**
 * Prefer deep pages (large skip/limit) to stress MongoDB pagination, not only "page 1".
 * @author Boh Xiang You Basil (A0273232M)
 */
function pickCatalogPage() {
  const tp = TOTAL_PAGES;
  if (tp < 2) return 1;
  const r = Math.random();
  if (r < 0.55) {
    const mid = Math.max(1, Math.floor(tp * 0.45));
    return randomInt(mid, tp);
  }
  if (r < 0.85) {
    const lo = Math.max(1, Math.floor(tp * 0.25));
    const hi = Math.min(tp, Math.floor(tp * 0.55));
    return randomInt(lo, Math.max(lo, hi));
  }
  return randomInt(1, Math.max(1, Math.floor(tp * 0.2)));
}

/** @author Boh Xiang You Basil (A0273232M) */
export default function () {
  // Full-collection style reads (sort + limit) — hits large Products collection
  const homeRes = http.get(`${API}/product/get-product`, {
    tags: {
      name: "GET /product/get-product",
      db_focus: "catalog_sort_limit",
    },
  });
  check(homeRes, { "home catalog 200": (r) => r.status === 200 });

  sleep(0.2);

  const countRes = http.get(`${API}/product/product-count`, {
    tags: { name: "GET /product/product-count", db_focus: "count_estimate" },
  });
  check(countRes, { "product-count 200": (r) => r.status === 200 });

  sleep(0.2);

  const catRes = http.get(`${API}/category/get-category`, {
    tags: { name: "GET /category/get-category", db_focus: "categories" },
  });
  check(catRes, { "categories 200": (r) => r.status === 200 });

  sleep(0.2);

  // All products in one category (can be hundreds of docs + populate)
  const catProdRes = http.get(
    `${API}/product/product-category/${VOLUME_CATEGORY_0_SLUG}`,
    {
      tags: {
        name: "GET /product/product-category/:slug",
        db_focus: "category_scan",
      },
    }
  );
  check(catProdRes, { "product-category 200": (r) => r.status === 200 });

  sleep(0.3);

  const page = pickCatalogPage();
  const listRes = http.get(`${API}/product/product-list/${page}`, {
    tags: { name: "GET /product/product-list/:page", db_focus: "pagination" },
  });
  check(listRes, { "product-list 200": (r) => r.status === 200 });

  if (listRes.status === 200) {
    try {
      const products = listRes.json().products;
      if (products && products.length > 0) {
        const product = products[randomInt(0, products.length - 1)];

        const detailRes = http.get(
          `${API}/product/get-product/${product.slug}`,
          {
            tags: {
              name: "GET /product/get-product/:slug",
              db_focus: "detail_by_slug",
            },
          }
        );
        check(detailRes, { "product-detail 200": (r) => r.status === 200 });

        sleep(0.2);

        const photoRes = http.get(
          `${API}/product/product-photo/${product._id}`,
          {
            tags: {
              name: "GET /product/product-photo/:pid",
              db_focus: "binary_read",
            },
          }
        );
        check(photoRes, {
          "product-photo 2xx": (r) => r.status >= 200 && r.status < 300,
        });

        sleep(0.2);

        if (detailRes.status === 200) {
          const body = detailRes.json();
          const p = body.product;
          const cid =
            p &&
            p.category &&
            (p.category._id || p.category);
          if (cid && product._id) {
            const relRes = http.get(
              `${API}/product/related-product/${product._id}/${cid}`,
              {
                tags: {
                  name: "GET /product/related-product/:pid/:cid",
                  db_focus: "related_query",
                },
              }
            );
            check(relRes, { "related 200": (r) => r.status === 200 });
          }
        }
      }
    } catch (_) {
      // JSON parse under load
    }
  }

  sleep(randomInt(1, 2));
}

/** @author Boh Xiang You Basil (A0273232M) */
export function handleSummary(data) {
  return volumeHandleSummary(data, {
    title: "Catalog & storage reads (pagination, category, photos)",
    slug: "browse-catalog",
  });
}
