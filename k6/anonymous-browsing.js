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
    { duration: "10s", target: 5 },
    { duration: "20s", target: 5 },
    { duration: "10s", target: 10 },
    { duration: "20s", target: 10 },
    { duration: "10s", target: 0 },
  ],
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
