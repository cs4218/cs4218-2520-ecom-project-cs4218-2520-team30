// Alek Kwek, A0273471A
import http from "k6/http";
import { sleep } from "k6";
import {
  BASE_URL,
  checkResponse,
  jsonParams,
  parseJson,
  pickFirstProduct,
  pickSearchKeyword,
} from "./helpers.js";

export const options = {
  stages: [
    { duration: "30s", target: 20 },   // ramp up to 20 VUs
    { duration: "1m",  target: 50 },   // ramp up to 50 VUs
    { duration: "2m",  target: 100 },  // sustain peak load (100 VUs)
    { duration: "1m",  target: 50 },   // scale back to 50 VUs
    { duration: "30s", target: 0 },    // ramp down
  ],
   thresholds: {
        "http_req_duration": ["p(95)<500"],
        "http_req_failed": ["rate<0.01"],
        "checks": ["rate>0.99"]
    },
};

export default () => {
  const [categoryResponse, countResponse, listResponse] = http.batch([
    ["GET", `${BASE_URL}/api/v1/category/get-category`],
    ["GET", `${BASE_URL}/api/v1/product/product-count`],
    ["GET", `${BASE_URL}/api/v1/product/product-list/1`],
  ]);

  checkResponse(categoryResponse, "get-category");
  checkResponse(countResponse, "product-count");
  checkResponse(listResponse, "product-list");

  const categoryBody = parseJson(categoryResponse) || {};
  const listBody = parseJson(listResponse) || {};
  const firstProduct = pickFirstProduct(listBody);

  if (!firstProduct) {
    sleep(1);
    return;
  }

  const detailResponse = http.get(
    `${BASE_URL}/api/v1/product/get-product/${firstProduct.slug}`
  );
  checkResponse(detailResponse, "get-product");

  const detailBody = parseJson(detailResponse) || {};
  const detailedProduct = detailBody.product || firstProduct;
  const categoryId =
    (detailedProduct.category && detailedProduct.category._id) ||
    (Array.isArray(categoryBody.category) && categoryBody.category[0]
      ? categoryBody.category[0]._id
      : "");

  const followUpRequests = [
    ["GET", `${BASE_URL}/api/v1/product/product-photo/${detailedProduct._id}`],
    [
      "POST",
      `${BASE_URL}/api/v1/product/product-filters`,
      JSON.stringify({
        checked: categoryId ? [categoryId] : [],
        radio: [],
      }),
      jsonParams(),
    ],
    [
      "GET",
      `${BASE_URL}/api/v1/product/search/${pickSearchKeyword(detailedProduct)}`,
    ],
  ];

  if (categoryId) {
    followUpRequests.splice(1, 0, [
      "GET",
      `${BASE_URL}/api/v1/product/related-product/${detailedProduct._id}/${categoryId}`,
    ]);
  }

  const responses = http.batch(followUpRequests);

  checkResponse(responses[0], "product-photo");

  if (categoryId) {
    checkResponse(responses[1], "related-product");
    checkResponse(responses[2], "product-filters");
    checkResponse(responses[3], "search");
  } else {
    checkResponse(responses[1], "product-filters");
    checkResponse(responses[2], "search");
  }

  sleep(1);
};
