/**
 * Shared k6 HTTP helpers for volume scenarios (auth, random utilities).
 * @author Boh Xiang You Basil (A0273232M)
 */
import http from "k6/http";
import { API, SEEDED_USER_PASSWORD } from "./config.js";

/** @author Boh Xiang You Basil (A0273232M) */
export function loginUser(email, password) {
  const res = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "login" } }
  );
  if (res.status === 200) {
    const body = res.json();
    if (body.token) return body.token;
  }
  return null;
}

/** @author Boh Xiang You Basil (A0273232M) */
export function authHeaders(token) {
  return { Authorization: token, "Content-Type": "application/json" };
}

/** @author Boh Xiang You Basil (A0273232M) */
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** @author Boh Xiang You Basil (A0273232M) */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** @author Boh Xiang You Basil (A0273232M) */
export function registerUser(email, password, name) {
  return http.post(
    `${API}/auth/register`,
    JSON.stringify({
      name: name || `Volume User ${Date.now()}`,
      email,
      password: password || SEEDED_USER_PASSWORD,
      phone: "90000000",
      address: "Volume Test Address",
      answer: "volume",
    }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "register" } }
  );
}

/** @author Boh Xiang You Basil (A0273232M) */
export function checkUserAuth(token) {
  return http.get(`${API}/auth/user-auth`, {
    headers: authHeaders(token),
    tags: { name: "user-auth" },
  });
}
