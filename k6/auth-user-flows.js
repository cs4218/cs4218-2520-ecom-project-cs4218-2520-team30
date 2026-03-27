// Alek Kwek, A0273471A
import http from "k6/http";
import { sleep } from "k6";
import {
  BASE_URL,
  checkResponse,
  jsonParams,
  loginAndGetToken,
  uniqueId,
} from "./helpers.js";

export const options = {
  stages: [
    { duration: "10s", target: 2 },
    { duration: "20s", target: 2 },
    { duration: "10s", target: 4 },
    { duration: "20s", target: 4 },
    { duration: "10s", target: 0 },
  ],
};

export default () => {
  const suffix = uniqueId("user");
  const email = `${suffix}@test.com`;
  const password = "password123";

  const registerResponse = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: `User ${suffix}`,
      email,
      password,
      phone: "1234567890",
      address: "123 Load Test Street",
      answer: "Football",
    }),
    jsonParams()
  );
  checkResponse(registerResponse, "register", [201]);

  const loginResult = loginAndGetToken(email, password);
  const token = loginResult.token;

  if (!token) {
    sleep(1);
    return;
  }

  const authParams = jsonParams(token);
  const [userAuthResponse, ordersResponse] = http.batch([
    ["GET", `${BASE_URL}/api/v1/auth/user-auth`, null, authParams],
    ["GET", `${BASE_URL}/api/v1/auth/orders`, null, authParams],
  ]);

  checkResponse(userAuthResponse, "user-auth");
  checkResponse(ordersResponse, "orders");

  const profileResponse = http.put(
    `${BASE_URL}/api/v1/auth/profile`,
    JSON.stringify({
      name: `Updated ${suffix}`,
      address: "456 Updated Street",
      phone: "0987654321",
    }),
    authParams
  );
  checkResponse(profileResponse, "profile");

  sleep(1);
};
