// Alek Kwek, A0273471A
import http from "k6/http";
import { check } from "k6";

export const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:6060";
const MAX_DURATION_MS = Number(__ENV.K6_MAX_DURATION_MS || 2000);

export function jsonParams(token = "") {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = token;
  }

  return { headers };
}

export function checkResponse(response, label, expectedStatuses = [200]) {
  check(response, {
    [`${label} status`]: (res) => expectedStatuses.includes(res.status),
    [`${label} under ${MAX_DURATION_MS}ms`]: (res) =>
      res.timings.duration < MAX_DURATION_MS,
  });
}

export function parseJson(response) {
  try {
    return response.json();
  } catch (error) {
    return null;
  }
}

export function uniqueId(prefix = "k6") {
  return `${prefix}-${__VU}-${__ITER}-${Date.now()}-${Math.floor(
    Math.random() * 100000
  )}`;
}

export function loginAndGetToken(email, password) {
  const response = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    jsonParams()
  );

  checkResponse(response, "login", [200]);

  const body = parseJson(response) || {};

  check(body, {
    "login returned token": (data) => Boolean(data.token),
  });

  return {
    response,
    body,
    token: body.token || "",
  };
}

export function pickFirstProduct(listBody) {
  if (!listBody || !Array.isArray(listBody.products) || listBody.products.length === 0) {
    return null;
  }

  return listBody.products[0];
}

export function pickSearchKeyword(product) {
  const name = product && product.name ? product.name.trim() : "";
  const firstWord = name.split(/\s+/).filter(Boolean)[0];

  return encodeURIComponent(firstWord || "test");
}
