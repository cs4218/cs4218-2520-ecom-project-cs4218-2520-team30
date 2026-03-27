// Alek Kwek, A0273471A
import http from "k6/http";
import { sleep } from "k6";
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

export const options = {
  stages: [
    { duration: "10s", target: 4 },
    { duration: "20s", target: 4 },
    { duration: "10s", target: 8 },
    { duration: "20s", target: 8 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
    checks: ["rate>0.95"],
  },
};

export function setup() {
  const email = __ENV.K6_ADMIN_EMAIL || "";
  const password = __ENV.K6_ADMIN_PASSWORD || "";

  if (!email || !password) {
    return { adminToken: "" };
  }

  const loginResult = loginAndGetToken(email, password);
  return { adminToken: loginResult.token || "" };
}

function runAnonymousFlow() {
  const [categoryResponse, countResponse, listResponse] = http.batch([
    ["GET", `${BASE_URL}/api/v1/category/get-category`],
    ["GET", `${BASE_URL}/api/v1/product/product-count`],
    ["GET", `${BASE_URL}/api/v1/product/product-list/1`],
  ]);

  checkResponse(categoryResponse, "mixed get-category");
  checkResponse(countResponse, "mixed product-count");
  checkResponse(listResponse, "mixed product-list");

  const categoryBody = parseJson(categoryResponse) || {};
  const listBody = parseJson(listResponse) || {};
  const firstProduct = pickFirstProduct(listBody);

  if (!firstProduct) {
    return;
  }

  const detailResponse = http.get(
    `${BASE_URL}/api/v1/product/get-product/${firstProduct.slug}`
  );
  checkResponse(detailResponse, "mixed get-product");

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

  checkResponse(responses[0], "mixed product-photo");

  if (categoryId) {
    checkResponse(responses[1], "mixed related-product");
    checkResponse(responses[2], "mixed product-filters");
    checkResponse(responses[3], "mixed search");
  } else {
    checkResponse(responses[1], "mixed product-filters");
    checkResponse(responses[2], "mixed search");
  }
}

function runUserFlow() {
  const suffix = uniqueId("mixed-user");
  const email = `${suffix}@test.com`;
  const password = "password123";

  const registerResponse = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: `Mixed User ${suffix}`,
      email,
      password,
      phone: "1234567890",
      address: "1 Mixed Flow Street",
      answer: "Football",
    }),
    jsonParams()
  );
  checkResponse(registerResponse, "mixed register", [201]);

  const loginResult = loginAndGetToken(email, password);

  if (!loginResult.token) {
    return;
  }

  const authParams = jsonParams(loginResult.token);
  const [userAuthResponse, ordersResponse] = http.batch([
    ["GET", `${BASE_URL}/api/v1/auth/user-auth`, null, authParams],
    ["GET", `${BASE_URL}/api/v1/auth/orders`, null, authParams],
  ]);

  checkResponse(userAuthResponse, "mixed user-auth");
  checkResponse(ordersResponse, "mixed orders");

  const profileResponse = http.put(
    `${BASE_URL}/api/v1/auth/profile`,
    JSON.stringify({
      name: `Mixed Updated ${suffix}`,
      address: "2 Mixed Flow Street",
      phone: "0987654321",
    }),
    authParams
  );
  checkResponse(profileResponse, "mixed profile");
}

function runAdminFlow(adminToken) {
  if (!adminToken) {
    runAnonymousFlow();
    return;
  }

  const adminParams = jsonParams(adminToken);
  const [adminAuthResponse, allOrdersResponse, categoryResponse, productResponse] =
    http.batch([
      ["GET", `${BASE_URL}/api/v1/auth/admin-auth`, null, adminParams],
      ["GET", `${BASE_URL}/api/v1/auth/all-orders`, null, adminParams],
      ["GET", `${BASE_URL}/api/v1/category/get-category`, null, adminParams],
      ["GET", `${BASE_URL}/api/v1/product/get-product`, null, adminParams],
    ]);

  checkResponse(adminAuthResponse, "mixed admin-auth");
  checkResponse(allOrdersResponse, "mixed all-orders");
  checkResponse(categoryResponse, "mixed admin get-category");
  checkResponse(productResponse, "mixed admin get-product");

  const allOrdersBody = parseJson(allOrdersResponse);
  const orders = Array.isArray(allOrdersBody) ? allOrdersBody : [];

  if (orders.length > 0) {
    const orderStatusResponse = http.put(
      `${BASE_URL}/api/v1/auth/order-status/${orders[0]._id}`,
      JSON.stringify({ status: orders[0].status || "Processing" }),
      adminParams
    );
    checkResponse(orderStatusResponse, "mixed order-status");
  }

  const createdCategoryName = `Mixed Category ${uniqueId("mixed-admin-category")}`;
  const createCategoryResponse = http.post(
    `${BASE_URL}/api/v1/category/create-category`,
    JSON.stringify({ name: createdCategoryName }),
    adminParams
  );
  checkResponse(createCategoryResponse, "mixed create-category", [201]);

  const createCategoryBody = parseJson(createCategoryResponse) || {};
  const createdCategory =
    createCategoryBody.category || (createCategoryBody.data && createCategoryBody.data.category);

  if (!createdCategory || !createdCategory._id) {
    return;
  }

  const updateCategoryResponse = http.put(
    `${BASE_URL}/api/v1/category/update-category/${createdCategory._id}`,
    JSON.stringify({ name: `${createdCategoryName} Updated` }),
    adminParams
  );
  checkResponse(updateCategoryResponse, "mixed update-category");

  const deleteCategoryResponse = http.del(
    `${BASE_URL}/api/v1/category/delete-category/${createdCategory._id}`,
    null,
    adminParams
  );
  checkResponse(deleteCategoryResponse, "mixed delete-category");
}

export default (data) => {
  const flow = Math.random();

  if (flow < 0.6) {
    runAnonymousFlow();
  } else if (flow < 0.85) {
    runUserFlow();
  } else {
    runAdminFlow(data.adminToken);
  }

  sleep(1);
};
