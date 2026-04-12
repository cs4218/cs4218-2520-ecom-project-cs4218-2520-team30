// Alek Kwek, A0273471A
import http from "k6/http";
import { sleep } from "k6";
import {
  BASE_URL,
  checkResponse,
  jsonParams,
  loginAndGetToken,
  parseJson,
  uniqueId,
} from "./helpers.js";

export const options = {
  stages: [
    { duration: "30s", target: 3 },   // ramp up to 3 VUs
    { duration: "1m",  target: 5 },   // ramp up to 5 VUs
    { duration: "2m",  target: 10 },  // sustain peak load (10 VUs)
    { duration: "1m",  target: 3 },   // scale back
    { duration: "30s", target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
    checks: ["rate>0.95"],
  },
};

export function setup() {
  const email = __ENV.K6_ADMIN_EMAIL || "playwright-admin@test.com";
  const password = __ENV.K6_ADMIN_PASSWORD || "adminpassword123";
  const loginResult = loginAndGetToken(email, password);

  if (!loginResult.token) {
    throw new Error(
      "Admin login failed. Set K6_ADMIN_EMAIL and K6_ADMIN_PASSWORD to a valid admin account."
    );
  }

  return {
    token: loginResult.token,
  };
}

export default (data) => {
  const adminParams = jsonParams(data.token);
  const [adminAuthResponse, allOrdersResponse, categoryResponse, productResponse] =
    http.batch([
      ["GET", `${BASE_URL}/api/v1/auth/admin-auth`, null, adminParams],
      ["GET", `${BASE_URL}/api/v1/auth/all-orders`, null, adminParams],
      ["GET", `${BASE_URL}/api/v1/category/get-category`, null, adminParams],
      ["GET", `${BASE_URL}/api/v1/product/get-product`, null, adminParams],
    ]);

  checkResponse(adminAuthResponse, "admin-auth");
  checkResponse(allOrdersResponse, "all-orders");
  checkResponse(categoryResponse, "admin get-category");
  checkResponse(productResponse, "admin get-product");

  const allOrdersBody = parseJson(allOrdersResponse);
  const orders = Array.isArray(allOrdersBody) ? allOrdersBody : [];

  if (orders.length > 0) {
    const order = orders[0];
    const status = order.status || "Processing";
    const orderStatusResponse = http.put(
      `${BASE_URL}/api/v1/auth/order-status/${order._id}`,
      JSON.stringify({ status }),
      adminParams
    );
    checkResponse(orderStatusResponse, "order-status");
  }

  const createdCategoryName = `K6 Category ${uniqueId("admin-category")}`;
  const createCategoryResponse = http.post(
    `${BASE_URL}/api/v1/category/create-category`,
    JSON.stringify({ name: createdCategoryName }),
    adminParams
  );
  checkResponse(createCategoryResponse, "create-category", [201]);

  const createCategoryBody = parseJson(createCategoryResponse) || {};
  const createdCategory =
    createCategoryBody.category || (createCategoryBody.data && createCategoryBody.data.category);

  if (!createdCategory || !createdCategory._id) {
    sleep(1);
    return;
  }

  const updatedCategoryName = `${createdCategoryName} Updated`;
  const updateCategoryResponse = http.put(
    `${BASE_URL}/api/v1/category/update-category/${createdCategory._id}`,
    JSON.stringify({ name: updatedCategoryName }),
    adminParams
  );
  checkResponse(updateCategoryResponse, "update-category");

  const deleteCategoryResponse = http.del(
    `${BASE_URL}/api/v1/category/delete-category/${createdCategory._id}`,
    null,
    adminParams
  );
  checkResponse(deleteCategoryResponse, "delete-category");

  sleep(1);
};
