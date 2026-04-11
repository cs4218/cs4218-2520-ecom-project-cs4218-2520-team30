/**
 * k6 scenario: product search & filters (regex + wide price band).
 * @author Boh Xiang You Basil (A0273232M)
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { API, DEFAULT_THRESHOLDS, sustainedStages } from "../config.js";
import { randomItem, randomInt } from "../helpers.js";
import { volumeHandleSummary } from "../summaryHtml.js";

const SEARCH_KEYWORDS = [
  "Premium",   "Classic",   "Ultra",     "Mega",      "Super",
  "Deluxe",    "Pro",       "Elite",     "Smart",     "Eco",
  "Vintage",   "Modern",    "Compact",   "Portable",  "Heavy",
  "Slim",      "Turbo",     "Nano",      "Titan",     "Flex",
  "Widget",    "Gadget",    "Device",    "Tool",      "Machine",
  "Keyboard",  "Mouse",     "Monitor",   "Speaker",   "Charger",
  "Headphone", "Camera",    "Lamp",      "Fan",       "Printer",
  "Router",    "Cable",     "Adapter",   "Battery",   "Sensor",
  "wireless",  "portable",  "smart",     "premium",   "compact",
  "durable",   "fast",      "secure",    "bright",    "silent",
];

/** Matches almost all seeded product names — stresses regex scan on large collection. */
const BROAD_KEYWORD = "__volume__";

export const options = {
  stages: sustainedStages(30, 180),
  thresholds: DEFAULT_THRESHOLDS,
  tags: { scenario: "search-products" },
};

/** @author Boh Xiang You Basil (A0273232M) */
export default function () {
  // Alternate: selective vs broad regex search (many matching documents)
  const keyword =
    __ITER % 3 === 0 ? BROAD_KEYWORD : randomItem(SEARCH_KEYWORDS);
  const searchRes = http.get(
    `${API}/product/search/${encodeURIComponent(keyword)}`,
    {
      tags: {
        name: "GET /product/search/:keyword",
        db_focus: keyword === BROAD_KEYWORD ? "regex_many_rows" : "regex_selective",
      },
    }
  );
  check(searchRes, { "search 200": (r) => r.status === 200 });

  sleep(0.5);

  // Wide price band returns many documents; response includes full product docs (incl. photo fields in JSON)
  const filterRes = http.post(
    `${API}/product/product-filters`,
    JSON.stringify({
      checked: [],
      radio: [0, 500],
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "POST /product/product-filters", db_focus: "wide_price_scan" },
    }
  );
  check(filterRes, { "filters 200": (r) => r.status === 200 });

  sleep(randomInt(1, 2));
}

/** @author Boh Xiang You Basil (A0273232M) */
export function handleSummary(data) {
  return volumeHandleSummary(data, {
    title: "Search & filters (regex + large result sets)",
    slug: "search-products",
  });
}
