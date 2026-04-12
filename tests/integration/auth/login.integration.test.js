/**
 * Integration Tests: loginController × userModel × authHelper (comparePassword)
 * Sandwich integration testing for the Login feature.
 
 */

import { jest, describe, beforeAll, afterAll, afterEach, it, expect } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import JWT from "jsonwebtoken";
import http from "http";
import userModel from "../../../models/userModel.js";
import { hashPassword, comparePassword } from "../../../helpers/authHelper.js";
import { loginController } from "../../../controllers/authController.js";

let mongoServer;

// Set JWT_SECRET for token generation
process.env.JWT_SECRET = "test-jwt-secret-key";

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await userModel.deleteMany({});
});

const createFakeResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

const createFakeRequest = (body = {}) => ({ body });

const validUserData = {
  name: "Test User",
  email: "testuser@test.com",
  password: "SecurePass123",
  phone: "91234567",
  address: "21 Lower Kent Ridge Rd, Singapore",
  answer: "My favourite colour is blue",
};

/**
 * Helper: seed a user into the database with a hashed password.
 * Returns the saved user document.
 */
const seedUser = async (overrides = {}) => {
  const data = { ...validUserData, ...overrides };
  const hashedPw = await hashPassword(data.password);
  const user = await new userModel({
    name: data.name,
    email: data.email,
    password: hashedPw,
    phone: data.phone,
    address: data.address,
    answer: data.answer,
    role: data.role ?? 0,
  }).save();
  return { user, plainPassword: data.password };
};

/**
 * Helper: send a real HTTP request to an Express server.
 * Uses Node's built-in http module — no supertest dependency needed.
 */
const makeRequest = (baseUrl, method, path, body) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);

    const options = {
      hostname: "127.0.0.1",
      port: new URL(baseUrl).port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          body: JSON.parse(responseBody),
        });
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
};

/**
 * Phase 1 (Bottom Layer): userModel + MongoDB Integration
 */
describe("Phase 1 [Bottom]: userModel + MongoDB Integration (Login Context)", () => {
  describe("User Lookup by Email", () => {
    // Tay Kai Jun A0283343E
    test("should find an existing user by email", async () => {
      await seedUser();
      const found = await userModel.findOne({ email: validUserData.email });

      expect(found).not.toBeNull();
      expect(found.name).toBe(validUserData.name);
      expect(found.email).toBe(validUserData.email);
    });

    // Tay Kai Jun A0283343E
    test("should return null for a non-existent email", async () => {
      const found = await userModel.findOne({ email: "nonexistent@test.com" });
      expect(found).toBeNull();
    });

    // Tay Kai Jun A0283343E
    test("should return the hashed password stored in the database", async () => {
      await seedUser();
      const found = await userModel.findOne({ email: validUserData.email });

      expect(found.password).toBeDefined();
      expect(found.password).not.toBe(validUserData.password);
      expect(found.password).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    // Tay Kai Jun A0283343E
    test("should return all fields needed for the login response payload", async () => {
      await seedUser();
      const found = await userModel.findOne({ email: validUserData.email });

      expect(found._id).toBeDefined();
      expect(found.name).toBeDefined();
      expect(found.email).toBeDefined();
      expect(found.phone).toBeDefined();
      expect(found.address).toBeDefined();
      expect(found.role).toBeDefined();
    });
  });
});

/**
 * Phase 2 (Bottom Layer): authHelper.comparePassword + bcrypt Integration
 */
describe("Phase 2 [Bottom]: authHelper.comparePassword + bcrypt Integration", () => {
  describe("comparePassword with real hashes", () => {
    // Tay Kai Jun A0283343E
    test("should return true when password matches its hash", async () => {
      const plainPassword = "SecurePass123";
      const hashed = await hashPassword(plainPassword);
      const result = await comparePassword(plainPassword, hashed);

      expect(result).toBe(true);
    });
    
    // Tay Kai Jun A0283343E
    test("should return false when password does not match the hash", async () => {
      const hashed = await hashPassword("CorrectPassword");
      const result = await comparePassword("WrongPassword", hashed);

      expect(result).toBe(false);
    });

    // Tay Kai Jun A0283343E
    test("should return false for empty string against a hash", async () => {
      const hashed = await hashPassword("SomePassword");
      const result = await comparePassword("", hashed);

      expect(result).toBe(false);
    });

    // Tay Kai Jun A0283343E
    test("should correctly verify password from a database-stored hash", async () => {
      const { user, plainPassword } = await seedUser();
      const dbUser = await userModel.findOne({ email: user.email });

      const isMatch = await comparePassword(plainPassword, dbUser.password);
      expect(isMatch).toBe(true);
    });

    // Tay Kai Jun A0283343E
    test("should reject wrong password against a database-stored hash", async () => {
      const { user } = await seedUser();
      const dbUser = await userModel.findOne({ email: user.email });

      const isMatch = await comparePassword("TotallyWrong", dbUser.password);
      expect(isMatch).toBe(false);
    });
  });
});

/**
  Phase 3 (Top Layer): Express Route Layer Integration (loginController)
 */
describe("Phase 3 [Top]: Express Route Layer (Login)", () => {
  let app;
  let server;
  let baseUrl;

  beforeAll(async () => {
    const express = (await import("express")).default;
    app = express();
    app.use(express.json());

    const authRouteModule = await import("../../../routes/authRoute.js");
    const authRoutes = authRouteModule.default?.default ?? authRouteModule.default;
    app.use("/api/v1/auth", authRoutes);

    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe("Route Mapping and Middleware", () => {
    // Tay Kai Jun A0283343E
    test("should respond to POST /api/v1/auth/login (route exists and is wired to controller)", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
        email: "route@test.com",
        password: "SomePassword123",
      });

      // The controller returns a structured JSON body with `success` and `message`.
      // An unmapped Express route would NOT produce this shape — it proves the route exists
      // and is wired to the loginController.
      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("message");
    });

    // Tay Kai Jun A0283343E
    test("should parse JSON request body through express.json() middleware", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {});

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("Email and password are required");
    });

    // Tay Kai Jun A0283343E
    test("should return 400 for validation errors through the HTTP stack", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
        email: "bad-email",
        password: "SomePassword123",
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Email must be a valid format");
    });

    // Tay Kai Jun A0283343E
    test("should return 400 when only email is provided (no password)", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
        email: "test@test.com",
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Password is required");
    });

    // Tay Kai Jun A0283343E
    test("should return 400 when only password is provided (no email)", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
        password: "SomePassword123",
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Email is required");
    });

    // Tay Kai Jun A0283343E
    test("should return 404 from controller for non-existent user (proves route + controller wiring)", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
        email: "noone@test.com",
        password: "SomePassword123",
      });

      // 404 from the controller means: route matched → middleware parsed body → controller ran
      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid email or password");
    });
  });
});

/**
  Phase 4 : loginController + userModel + authHelper + JWT Integration
 */
describe("Phase 4 [Middle — Sandwich]: loginController + userModel + authHelper + JWT Integration", () => {


  describe("Full HTTP End-to-End (Sandwich)", () => {
    let app;
    let server;
    let baseUrl;

    beforeAll(async () => {
      const express = (await import("express")).default;
      app = express();
      app.use(express.json());

      const authRouteModule = await import("../../../routes/authRoute.js");
      const authRoutes = authRouteModule.default?.default ?? authRouteModule.default;
      app.use("/api/v1/auth", authRoutes);

      await new Promise((resolve) => {
        server = app.listen(0, "127.0.0.1", () => {
          const addr = server.address();
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterAll(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    // Tay Kai Jun A0283343E
    test("should log in successfully through full HTTP + Express + Controller + DB stack", async () => {
      await seedUser();

      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
        email: validUserData.email,
        password: validUserData.password,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged in successfully");
      expect(response.body.token).toBeDefined();
      expect(response.body.user.name).toBe(validUserData.name);
      expect(response.body.user.email).toBe(validUserData.email);
      expect(response.body.user.phone).toBe(validUserData.phone);
      expect(response.body.user.address).toBe(validUserData.address);
      expect(response.body.user.role).toBe(0);
      expect(response.body.user.password).toBeUndefined();
    });

    test("should return a valid JWT token through the full HTTP stack", async () => {
      await seedUser();

      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
        email: validUserData.email,
        password: validUserData.password,
      });

      expect(response.statusCode).toBe(200);
      const decoded = JWT.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded._id).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    // Tay Kai Jun A0283343E
    test("should reject wrong password through the full HTTP stack", async () => {
      await seedUser();

      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
        email: validUserData.email,
        password: "WrongPassword123",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid email or password");
      expect(response.body.token).toBeUndefined();
    });

    // Tay Kai Jun A0283343E
    test("should return 404 for non-existent user through the full HTTP stack", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
        email: "noone@test.com",
        password: "SomePassword123",
      });

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid email or password");
    });
  });


  describe("Successful Login Flow (Controller-level)", () => {
    // Tay Kai Jun A0283343E
    test("should log in a valid user and return 200 with success payload", async () => {
      await seedUser();

      const req = createFakeRequest({
        email: validUserData.email,
        password: validUserData.password,
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Logged in successfully",
        })
      );
    });

    // Tay Kai Jun A0283343E
    test("should return user payload with correct fields (no password)", async () => {
      const { user } = await seedUser();

      const req = createFakeRequest({
        email: validUserData.email,
        password: validUserData.password,
      });
      const res = createFakeResponse();

      await loginController(req, res);

      const responsePayload = res.send.mock.calls[0][0];
      expect(responsePayload.user).toBeDefined();
      expect(responsePayload.user._id).toBeDefined();
      expect(responsePayload.user.name).toBe(validUserData.name);
      expect(responsePayload.user.email).toBe(validUserData.email);
      expect(responsePayload.user.phone).toBe(validUserData.phone);
      expect(responsePayload.user.address).toBe(validUserData.address);
      expect(responsePayload.user.role).toBe(0);
      expect(responsePayload.user.password).toBeUndefined();
    });

    // Tay Kai Jun A0283343E
    test("should return a valid JWT token signed with JWT_SECRET", async () => {
      await seedUser();

      const req = createFakeRequest({
        email: validUserData.email,
        password: validUserData.password,
      });
      const res = createFakeResponse();

      await loginController(req, res);

      const responsePayload = res.send.mock.calls[0][0];
      expect(responsePayload.token).toBeDefined();
      expect(typeof responsePayload.token).toBe("string");

      const decoded = JWT.verify(responsePayload.token, process.env.JWT_SECRET);
      expect(decoded._id).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    // Tay Kai Jun A0283343E
    test("should generate a JWT token that contains the correct user ID", async () => {
      const { user } = await seedUser();

      const req = createFakeRequest({
        email: validUserData.email,
        password: validUserData.password,
      });
      const res = createFakeResponse();

      await loginController(req, res);

      const responsePayload = res.send.mock.calls[0][0];
      const decoded = JWT.verify(responsePayload.token, process.env.JWT_SECRET);
      expect(decoded._id).toBe(user._id.toString());
    });

    // Tay Kai Jun A0283343E
    test("should generate a JWT token with 7-day expiry", async () => {
      await seedUser();

      const req = createFakeRequest({
        email: validUserData.email,
        password: validUserData.password,
      });
      const res = createFakeResponse();

      await loginController(req, res);

      const responsePayload = res.send.mock.calls[0][0];
      const decoded = JWT.verify(responsePayload.token, process.env.JWT_SECRET);

      const now = Math.floor(Date.now() / 1000);
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      expect(decoded.exp - now).toBeGreaterThan(sevenDaysInSeconds - 60);
      expect(decoded.exp - now).toBeLessThanOrEqual(sevenDaysInSeconds);
    });
  });

  describe("Invalid Credentials (Controller + comparePassword + Database)", () => {
    // Tay Kai Jun A0283343E
    test("should return 404 when email does not exist in the database", async () => {
      const req = createFakeRequest({
        email: "nonexistent@test.com",
        password: "SomePassword123",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    // Tay Kai Jun A0283343E
    test("should return 200 with failure when password is incorrect", async () => {
      await seedUser();

      const req = createFakeRequest({
        email: validUserData.email,
        password: "WrongPassword123",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    // Tay Kai Jun A0283343E
    test("should not return a token when password is incorrect", async () => {
      await seedUser();

      const req = createFakeRequest({
        email: validUserData.email,
        password: "WrongPassword123",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      const responsePayload = res.send.mock.calls[0][0];
      expect(responsePayload.token).toBeUndefined();
    });

    // Tay Kai Jun A0283343E
    test("should not return a token when email does not exist", async () => {
      const req = createFakeRequest({
        email: "ghost@test.com",
        password: "SomePassword123",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      const responsePayload = res.send.mock.calls[0][0];
      expect(responsePayload.token).toBeUndefined();
    });
  });

  describe("Field Validation (Controller Validates Before DB Interaction)", () => {
    // Tay Kai Jun A0283343E
    test("should return 400 when both email and password are missing", async () => {
      const req = createFakeRequest({});
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Email and password are required",
      });
    });

    // Tay Kai Jun A0283343E
    test("should return 400 when email is missing but password is provided", async () => {
      const req = createFakeRequest({ password: "SomePassword123" });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is required",
      });
    });

    // Tay Kai Jun A0283343E
    test("should return 400 when password is missing but email is provided", async () => {
      const req = createFakeRequest({ email: "test@test.com" });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Password is required",
      });
    });

    // Tay Kai Jun A0283343E
    test("should return 400 for invalid email format", async () => {
      const req = createFakeRequest({
        email: "notanemail",
        password: "SomePassword123",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Email must be a valid format",
      });
    });

    // Tay Kai Jun A0283343E
    test("should return 400 for password shorter than 6 characters", async () => {
      const req = createFakeRequest({
        email: "test@test.com",
        password: "Ab1",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    });

    // Tay Kai Jun A0283343E
    test("should not query the database when validation fails", async () => {
      await seedUser();

      const spy = jest.spyOn(userModel, "findOne");

      const req = createFakeRequest({
        email: "bad-email",
        password: "SomePassword123",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("Login with Different User Roles", () => {
    // Tay Kai Jun A0283343E
    test("should return role 0 for a regular user", async () => {
      await seedUser({ role: 0 });

      const req = createFakeRequest({
        email: validUserData.email,
        password: validUserData.password,
      });
      const res = createFakeResponse();

      await loginController(req, res);

      const responsePayload = res.send.mock.calls[0][0];
      expect(responsePayload.user.role).toBe(0);
    });

    // Tay Kai Jun A0283343E
    test("should return role 1 for an admin user", async () => {
      await seedUser({ role: 1 });

      const req = createFakeRequest({
        email: validUserData.email,
        password: validUserData.password,
      });
      const res = createFakeResponse();

      await loginController(req, res);

      const responsePayload = res.send.mock.calls[0][0];
      expect(responsePayload.user.role).toBe(1);
    });

    // Tay Kai Jun A0283343E
    test("should return full admin payload with role 1 and valid token", async () => {
      const { user } = await seedUser({ role: 1 });

      const req = createFakeRequest({
        email: validUserData.email,
        password: validUserData.password,
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responsePayload = res.send.mock.calls[0][0];
      expect(responsePayload.success).toBe(true);
      expect(responsePayload.message).toBe("Logged in successfully");
      expect(responsePayload.user.role).toBe(1);
      expect(responsePayload.user.name).toBe(validUserData.name);
      expect(responsePayload.user.email).toBe(validUserData.email);
      expect(responsePayload.token).toBeDefined();

      const decoded = JWT.verify(responsePayload.token, process.env.JWT_SECRET);
      expect(decoded._id).toBe(user._id.toString());
    });

    // Tay Kai Jun A0283343E
    test("should distinguish admin (role 1) from regular user (role 0) in the same database", async () => {
      await seedUser({ email: "admin@test.com", password: "AdminPass123", role: 1 });
      await seedUser({ email: "regular@test.com", password: "RegularPass123", role: 0 });

      // Login as admin
      const adminReq = createFakeRequest({ email: "admin@test.com", password: "AdminPass123" });
      const adminRes = createFakeResponse();
      await loginController(adminReq, adminRes);

      const adminPayload = adminRes.send.mock.calls[0][0];
      expect(adminPayload.success).toBe(true);
      expect(adminPayload.user.role).toBe(1);
      expect(adminPayload.user.email).toBe("admin@test.com");

      // Login as regular user
      const regularReq = createFakeRequest({ email: "regular@test.com", password: "RegularPass123" });
      const regularRes = createFakeResponse();
      await loginController(regularReq, regularRes);

      const regularPayload = regularRes.send.mock.calls[0][0];
      expect(regularPayload.success).toBe(true);
      expect(regularPayload.user.role).toBe(0);
      expect(regularPayload.user.email).toBe("regular@test.com");
    });
  });

  describe("Multiple Users Login (Isolation)", () => {
    // Tay Kai Jun A0283343E
    test("should log in the correct user among multiple users in the database", async () => {
      await seedUser({ email: "user1@test.com", password: "Password111" });
      await seedUser({ email: "user2@test.com", password: "Password222" });
      await seedUser({ email: "user3@test.com", password: "Password333" });

      const req = createFakeRequest({
        email: "user2@test.com",
        password: "Password222",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responsePayload = res.send.mock.calls[0][0];
      expect(responsePayload.success).toBe(true);
      expect(responsePayload.user.email).toBe("user2@test.com");
    });

    // Tay Kai Jun A0283343E
    test("should reject login with another user's password", async () => {
      await seedUser({ email: "alice@test.com", password: "AlicePass123" });
      await seedUser({ email: "bob@test.com", password: "BobPass456" });

      const req = createFakeRequest({
        email: "alice@test.com",
        password: "BobPass456",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });
  });

  describe("Password Security (comparePassword + Database)", () => {
    // Tay Kai Jun A0283343E
    test("should verify correct password against bcrypt hash stored in DB", async () => {
      const { user, plainPassword } = await seedUser();

      const dbUser = await userModel.findOne({ email: user.email });
      const isMatch = await comparePassword(plainPassword, dbUser.password);
      expect(isMatch).toBe(true);
    });
// Tay Kai Jun A0283343E
    test("should handle special characters in password during login", async () => {
      await seedUser({ password: "P@$$w0rd!#%^&*" });

      const req = createFakeRequest({
        email: validUserData.email,
        password: "P@$$w0rd!#%^&*",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
    // Tay Kai Jun A0283343E
    test("should handle very long password during login", async () => {
      const longPassword = "A".repeat(200);
      await seedUser({ password: longPassword });

      const req = createFakeRequest({
        email: validUserData.email,
        password: longPassword,
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe("Edge Cases (Boundary Value Analysis)", () => {
    // Tay Kai Jun A0283343E
    test("should accept password with exactly 6 characters (boundary)", async () => {
      await seedUser({ password: "Pass12" });

      const req = createFakeRequest({
        email: validUserData.email,
        password: "Pass12",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    // Tay Kai Jun A0283343E
    test("should reject password with exactly 5 characters (boundary)", async () => {
      const req = createFakeRequest({
        email: validUserData.email,
        password: "Pas12",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    });

    // Tay Kai Jun A0283343E
    test("should return 400 when email is empty string", async () => {
      const req = createFakeRequest({
        email: "",
        password: "SomePassword123",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    // Tay Kai Jun A0283343E
    test("should return 400 when password is empty string", async () => {
      const req = createFakeRequest({
        email: "test@test.com",
        password: "",
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("Error Handling (Controller catch block with DB)", () => {
    // Tay Kai Jun A0283343E
    test("should return 500 when database connection is interrupted during findOne", async () => {
      jest.spyOn(userModel, "findOne").mockRejectedValueOnce(new Error("DB connection lost"));
      jest.spyOn(console, "log").mockImplementation(() => {});

      const req = createFakeRequest({
        email: validUserData.email,
        password: validUserData.password,
      });
      const res = createFakeResponse();

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in login",
        })
      );

      userModel.findOne.mockRestore();
      console.log.mockRestore();
    });
  });
});
