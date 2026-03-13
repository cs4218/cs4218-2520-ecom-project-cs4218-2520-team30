/**
 * Integration Tests: forgotPasswordController × userModel × authHelper
 * Sandwich integration testing for the Forgot Password feature.
 *
 * Sandwich approach:
 *   - Phase 1 (Bottom): userModel + MongoDB tested independently
 *   - Phase 2 (Bottom): authHelper (hashPassword + comparePassword) tested independently
 *   - Phase 3 (Top):    Express route layer tested independently
 *   - Phase 4 (Middle): forgotPasswordController integrates top ↔ bottom with real DB,
 *                        real authHelper, and real HTTP requests
 *
 * Verifies the user flow of submitting forgot-password credentials (email, answer,
 * newPassword), looking up the user by email + answer, hashing the new password,
 * persisting the update, and returning the correct success or error response.
 */

import { jest, describe, beforeAll, afterAll, afterEach, it, expect } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import userModel from "../../../models/userModel.js";
import { hashPassword, comparePassword } from "../../../helpers/authHelper.js";
import { forgotPasswordController } from "../../../controllers/authController.js";

let mongoServer;

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
  return res;
};

const createFakeRequest = (body = {}) => ({ body });

const validUserData = {
  name: "Test User",
  email: "testuser@test.com",
  password: "OldPassword123",
  phone: "91234567",
  address: "21 Lower Kent Ridge Rd, Singapore",
  answer: "My favourite colour is blue",
};

/**
 * Helper: seed a user into the database with a hashed password.
 * Returns the saved user document and the plain password.
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
    const http = require("http");
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
 * ============================================================
 * Phase 1 (Bottom Layer): userModel + MongoDB Integration
 *
 * Tests the lowest layer in isolation — Mongoose model operations
 * against a real in-memory MongoDB. Verifies user lookup by
 * email + answer, and password update via findByIdAndUpdate.
 * ============================================================
 */
describe("Phase 1 [Bottom]: userModel + MongoDB Integration (Forgot Password Context)", () => {
  describe("User Lookup by Email and Answer", () => {
    test("should find an existing user by email and answer", async () => {
      await seedUser();
      const found = await userModel.findOne({
        email: validUserData.email,
        answer: validUserData.answer,
      });

      expect(found).not.toBeNull();
      expect(found.name).toBe(validUserData.name);
      expect(found.email).toBe(validUserData.email);
      expect(found.answer).toBe(validUserData.answer);
    });

    test("should return null when email matches but answer does not", async () => {
      await seedUser();
      const found = await userModel.findOne({
        email: validUserData.email,
        answer: "Wrong answer",
      });

      expect(found).toBeNull();
    });

    test("should return null when answer matches but email does not", async () => {
      await seedUser();
      const found = await userModel.findOne({
        email: "wrong@test.com",
        answer: validUserData.answer,
      });

      expect(found).toBeNull();
    });

    test("should return null when neither email nor answer match", async () => {
      await seedUser();
      const found = await userModel.findOne({
        email: "wrong@test.com",
        answer: "Wrong answer",
      });

      expect(found).toBeNull();
    });

    test("should return null when no users exist in the database", async () => {
      const found = await userModel.findOne({
        email: validUserData.email,
        answer: validUserData.answer,
      });

      expect(found).toBeNull();
    });
  });

  describe("Password Update via findByIdAndUpdate", () => {
    test("should update the password field for an existing user", async () => {
      const { user } = await seedUser();
      const newHashedPw = await hashPassword("NewPassword456");

      await userModel.findByIdAndUpdate(user._id, { password: newHashedPw });

      const updated = await userModel.findById(user._id);
      expect(updated.password).toBe(newHashedPw);
      expect(updated.password).not.toBe(user.password);
    });

    test("should not modify other fields when updating password", async () => {
      const { user } = await seedUser();
      const newHashedPw = await hashPassword("NewPassword456");

      await userModel.findByIdAndUpdate(user._id, { password: newHashedPw });

      const updated = await userModel.findById(user._id);
      expect(updated.name).toBe(user.name);
      expect(updated.email).toBe(user.email);
      expect(updated.phone).toBe(user.phone);
      expect(updated.address).toBe(user.address);
      expect(updated.answer).toBe(user.answer);
      expect(updated.role).toBe(user.role);
    });
  });
});

/**
 * ============================================================
 * Phase 2 (Bottom Layer): authHelper (hashPassword + comparePassword)
 *
 * Tests the second bottom layer — password hashing helper
 * integrated with bcrypt. Verifies that a new password can be
 * hashed and later verified via comparePassword.
 * ============================================================
 */
describe("Phase 2 [Bottom]: authHelper <-> bcrypt Integration (Forgot Password Context)", () => {
  describe("hashPassword for new password", () => {
    test("should hash a new password and return a bcrypt-format string", async () => {
      const hashed = await hashPassword("NewPassword456");

      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe("string");
      expect(hashed).not.toBe("NewPassword456");
      expect(hashed).toMatch(/^\$2[aby]\$/);
    });

    test("should produce different hashes for old and new passwords", async () => {
      const hashOld = await hashPassword("OldPassword123");
      const hashNew = await hashPassword("NewPassword456");

      expect(hashOld).not.toBe(hashNew);
    });
  });

  describe("hashPassword + comparePassword round-trip (password reset)", () => {
    test("should verify the new password against its hash after reset", async () => {
      const newPassword = "NewPassword456";
      const hashed = await hashPassword(newPassword);

      const isMatch = await comparePassword(newPassword, hashed);
      expect(isMatch).toBe(true);
    });

    test("should reject the old password against the new hash after reset", async () => {
      const oldPassword = "OldPassword123";
      const newPassword = "NewPassword456";
      const newHash = await hashPassword(newPassword);

      const isMatch = await comparePassword(oldPassword, newHash);
      expect(isMatch).toBe(false);
    });

    test("should verify new password from DB after an in-place update", async () => {
      const { user } = await seedUser();
      const newPassword = "ResetPass789";
      const newHash = await hashPassword(newPassword);

      await userModel.findByIdAndUpdate(user._id, { password: newHash });

      const updated = await userModel.findById(user._id);
      const isMatch = await comparePassword(newPassword, updated.password);
      expect(isMatch).toBe(true);
    });

    test("should reject old password from DB after an in-place update", async () => {
      const { user, plainPassword } = await seedUser();
      const newHash = await hashPassword("ResetPass789");

      await userModel.findByIdAndUpdate(user._id, { password: newHash });

      const updated = await userModel.findById(user._id);
      const isMatch = await comparePassword(plainPassword, updated.password);
      expect(isMatch).toBe(false);
    });
  });
});

/**
 * ============================================================
 * Phase 3 (Top Layer): Express Route Layer (Independent)
 *
 * Tests the top layer in isolation — verifies that the Express
 * route configuration correctly maps POST /api/v1/auth/forgot-password
 * to the forgotPasswordController, that express.json() middleware
 * parses the request body, and that the HTTP transport works.
 * ============================================================
 */
describe("Phase 3 [Top]: Express Route Layer (Forgot Password)", () => {
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
    test("should respond to POST /api/v1/auth/forgot-password (route exists and is wired to controller)", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/forgot-password", {
        email: "route@test.com",
        answer: "some answer",
        newPassword: "SomePassword123",
      });

      // The controller returns a structured JSON body with `message`.
      // An unmapped route would NOT produce this shape.
      expect(response.body).toHaveProperty("message");
    });

    test("should parse JSON request body through express.json() middleware", async () => {
      // Empty body — controller validation ("Email is required") proves body was parsed
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/forgot-password", {});

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("Email is required");
    });

    test("should return 400 when only email is provided", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/forgot-password", {
        email: "test@test.com",
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("Answer is required");
    });

    test("should return 400 when only email and answer are provided (no newPassword)", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/forgot-password", {
        email: "test@test.com",
        answer: "some answer",
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("New password is required");
    });

    test("should return 404 from controller for non-existent user (proves route → controller wiring)", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/forgot-password", {
        email: "noone@test.com",
        answer: "some answer",
        newPassword: "NewPassword123",
      });

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Wrong email or answer");
    });
  });
});

/**
 * ============================================================
 * Phase 4 (Middle Layer — Full Sandwich Integration):
 * forgotPasswordController + userModel + authHelper
 *
 * The "filling" of the sandwich. Now that the bottom layers
 * (DB model, authHelper) and the top layer (Express routes,
 * HTTP transport, middleware) have been verified independently,
 * this phase integrates the forgotPasswordController as the
 * middle layer that connects everything.
 *
 *   HTTP POST → Express middleware → Route → forgotPasswordController
 *     → userModel.findOne({ email, answer }) (real MongoDB)
 *     → hashPassword (real bcrypt)
 *     → userModel.findByIdAndUpdate (real MongoDB)
 *     → HTTP JSON response
 * ============================================================
 */
describe("Phase 4 [Middle — Sandwich]: forgotPasswordController + userModel + authHelper Integration", () => {

  // ── 4a: Full HTTP End-to-End (top meets bottom through middle) ──

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

    test("should reset password successfully through full HTTP → Express → Controller → DB stack", async () => {
      await seedUser();
      const newPassword = "BrandNewPass789";

      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/forgot-password", {
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Password reset successfully");

      // Verify the new password was actually persisted in the DB
      const dbUser = await userModel.findOne({ email: validUserData.email });
      const isMatch = await comparePassword(newPassword, dbUser.password);
      expect(isMatch).toBe(true);
    });

    test("should reject wrong answer through the full HTTP stack", async () => {
      await seedUser();

      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/forgot-password", {
        email: validUserData.email,
        answer: "Wrong answer",
        newPassword: "NewPassword123",
      });

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Wrong email or answer");
    });

    test("should reject non-existent email through the full HTTP stack", async () => {
      await seedUser();

      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/forgot-password", {
        email: "noone@test.com",
        answer: validUserData.answer,
        newPassword: "NewPassword123",
      });

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Wrong email or answer");
    });

    test("should return 400 for missing fields through the full HTTP stack", async () => {
      const response = await makeRequest(baseUrl, "POST", "/api/v1/auth/forgot-password", {});

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("Email is required");
    });
  });

  // ── 4b: Controller-level detailed tests (middle layer behaviour) ──

  describe("Successful Password Reset Flow (Controller-level)", () => {
    test("should reset password and return 200 with success payload", async () => {
      await seedUser();
      const newPassword = "NewPassword456";

      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword,
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Password reset successfully",
      });
    });

    test("should persist the new hashed password in the database", async () => {
      await seedUser();
      const newPassword = "NewPassword456";

      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword,
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      const dbUser = await userModel.findOne({ email: validUserData.email });
      expect(dbUser.password).not.toBe(newPassword);
      expect(dbUser.password).toMatch(/^\$2[aby]\$/); // bcrypt format

      const isMatch = await comparePassword(newPassword, dbUser.password);
      expect(isMatch).toBe(true);
    });

    test("should invalidate the old password after reset", async () => {
      const { plainPassword } = await seedUser();
      const newPassword = "NewPassword456";

      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword,
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      const dbUser = await userModel.findOne({ email: validUserData.email });
      const oldMatch = await comparePassword(plainPassword, dbUser.password);
      expect(oldMatch).toBe(false);
    });

    test("should not modify other user fields when resetting password", async () => {
      const { user } = await seedUser();

      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      const dbUser = await userModel.findOne({ email: validUserData.email });
      expect(dbUser.name).toBe(user.name);
      expect(dbUser.email).toBe(user.email);
      expect(dbUser.phone).toBe(user.phone);
      expect(dbUser.address).toBe(user.address);
      expect(dbUser.answer).toBe(user.answer);
      expect(dbUser.role).toBe(user.role);
    });
  });

  describe("Invalid Credentials (Controller + Database)", () => {
    test("should return 404 when email does not exist", async () => {
      await seedUser();

      const req = createFakeRequest({
        email: "nonexistent@test.com",
        answer: validUserData.answer,
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer",
      });
    });

    test("should return 404 when answer is incorrect", async () => {
      await seedUser();

      const req = createFakeRequest({
        email: validUserData.email,
        answer: "Totally wrong answer",
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer",
      });
    });

    test("should return 404 when both email and answer are wrong", async () => {
      await seedUser();

      const req = createFakeRequest({
        email: "wrong@test.com",
        answer: "Wrong answer",
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer",
      });
    });

    test("should not modify the password when email/answer verification fails", async () => {
      const { user } = await seedUser();
      const originalPassword = user.password;

      const req = createFakeRequest({
        email: validUserData.email,
        answer: "Wrong answer",
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      const dbUser = await userModel.findOne({ email: validUserData.email });
      expect(dbUser.password).toBe(originalPassword);
    });
  });

  describe("Field Validation (Controller Validates Before DB Interaction)", () => {
    test("should return 400 when email is missing", async () => {
      const req = createFakeRequest({
        answer: validUserData.answer,
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Email is required" });
    });

    test("should return 400 when answer is missing", async () => {
      const req = createFakeRequest({
        email: validUserData.email,
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Answer is required" });
    });

    test("should return 400 when newPassword is missing", async () => {
      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "New password is required" });
    });

    test("should return 400 when all fields are missing", async () => {
      const req = createFakeRequest({});
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Email is required" });
    });

    test("should return 400 when email is empty string", async () => {
      const req = createFakeRequest({
        email: "",
        answer: validUserData.answer,
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Email is required" });
    });

    test("should return 400 when answer is empty string", async () => {
      const req = createFakeRequest({
        email: validUserData.email,
        answer: "",
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Answer is required" });
    });

    test("should return 400 when newPassword is empty string", async () => {
      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword: "",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "New password is required" });
    });

    test("should not query the database when validation fails", async () => {
      await seedUser();
      const spy = jest.spyOn(userModel, "findOne");

      const req = createFakeRequest({ email: "" });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("Multiple Users Isolation", () => {
    test("should only reset the password for the matched user", async () => {
      const { user: user1 } = await seedUser({ email: "user1@test.com", answer: "answer1", password: "OldPass111" });
      const { user: user2 } = await seedUser({ email: "user2@test.com", answer: "answer2", password: "OldPass222" });

      const req = createFakeRequest({
        email: "user1@test.com",
        answer: "answer1",
        newPassword: "NewPass111",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // user1 password should be updated
      const dbUser1 = await userModel.findOne({ email: "user1@test.com" });
      const isMatch1 = await comparePassword("NewPass111", dbUser1.password);
      expect(isMatch1).toBe(true);

      // user2 password should remain unchanged
      const dbUser2 = await userModel.findOne({ email: "user2@test.com" });
      const isMatch2 = await comparePassword("OldPass222", dbUser2.password);
      expect(isMatch2).toBe(true);
    });

    test("should not allow resetting password with another user's answer", async () => {
      await seedUser({ email: "alice@test.com", answer: "alice answer" });
      await seedUser({ email: "bob@test.com", answer: "bob answer" });

      const req = createFakeRequest({
        email: "alice@test.com",
        answer: "bob answer",
        newPassword: "NewPassword123",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer",
      });
    });
  });

  describe("Password Security (hashPassword + Database)", () => {
    test("should store only the hashed password, not plaintext", async () => {
      await seedUser();
      const newPassword = "PlainTextCheck123";

      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword,
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      const dbUser = await userModel.findOne({ email: validUserData.email });
      expect(dbUser.password).not.toBe(newPassword);
      expect(dbUser.password).toMatch(/^\$2[aby]\$/);
    });

    test("should handle special characters in new password", async () => {
      await seedUser();
      const newPassword = "P@$$w0rd!#%^&*";

      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword,
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const dbUser = await userModel.findOne({ email: validUserData.email });
      const isMatch = await comparePassword(newPassword, dbUser.password);
      expect(isMatch).toBe(true);
    });

    test("should handle very long new password", async () => {
      await seedUser();
      const newPassword = "A".repeat(200);

      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword,
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const dbUser = await userModel.findOne({ email: validUserData.email });
      const isMatch = await comparePassword(newPassword, dbUser.password);
      expect(isMatch).toBe(true);
    });

    test("should allow resetting to the same password as the old one", async () => {
      const { plainPassword } = await seedUser();

      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword: plainPassword,
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const dbUser = await userModel.findOne({ email: validUserData.email });
      const isMatch = await comparePassword(plainPassword, dbUser.password);
      expect(isMatch).toBe(true);
    });
  });

  describe("Sequential Password Resets", () => {
    test("should allow multiple consecutive password resets for the same user", async () => {
      await seedUser();

      // First reset
      const req1 = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword: "FirstReset111",
      });
      const res1 = createFakeResponse();
      await forgotPasswordController(req1, res1);
      expect(res1.status).toHaveBeenCalledWith(200);

      // Second reset
      const req2 = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword: "SecondReset222",
      });
      const res2 = createFakeResponse();
      await forgotPasswordController(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(200);

      // Only the latest password should work
      const dbUser = await userModel.findOne({ email: validUserData.email });
      expect(await comparePassword("FirstReset111", dbUser.password)).toBe(false);
      expect(await comparePassword("SecondReset222", dbUser.password)).toBe(true);
    });
  });

  describe("Error Handling (Controller catch block with DB)", () => {
    test("should return 500 when database connection is interrupted during findOne", async () => {
      jest.spyOn(userModel, "findOne").mockRejectedValueOnce(new Error("DB connection lost"));
      jest.spyOn(console, "log").mockImplementation(() => {});

      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Something went wrong",
        })
      );

      userModel.findOne.mockRestore();
      console.log.mockRestore();
    });

    test("should return 500 when database fails during findByIdAndUpdate", async () => {
      await seedUser();
      jest.spyOn(userModel, "findByIdAndUpdate").mockRejectedValueOnce(new Error("DB write failed"));
      jest.spyOn(console, "log").mockImplementation(() => {});

      const req = createFakeRequest({
        email: validUserData.email,
        answer: validUserData.answer,
        newPassword: "NewPassword456",
      });
      const res = createFakeResponse();

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Something went wrong",
        })
      );

      userModel.findByIdAndUpdate.mockRestore();
      console.log.mockRestore();
    });
  });
});
