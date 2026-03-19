/**
 * Integration Tests: registerController × userModel × authHelper
 * Author: Tay Kai Jun, A0283343E
 *
 */

import { jest, describe, beforeAll, afterAll, afterEach, it, expect } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import userModel from "../../../models/userModel.js";
import { hashPassword, comparePassword } from "../../../helpers/authHelper.js";
import { registerController } from "../../../controllers/authController.js";


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
  password: "SecurePass123",
  phone: "91234567",
  address: "21 Lower Kent Ridge Rd, Singapore",
  answer: "My favourite colour is blue",
};

/** 
* Phase 1: Database + Model Integration
**/

describe("Phase 1: userModel + MongoDB Integration", () => {
  // Tay Kai Jun, A0283343E

  describe("User Creation and Persistence", () => {
    test("should save a valid user to the database and persist all fields", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword123",
        phone: "91234567",
        address: "NUS Computing",
        answer: "blue",
      };

      const user = await new userModel(userData).save();

      expect(user._id).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.password).toBe(userData.password);
      expect(user.phone).toBe(userData.phone);
      expect(user.address).toBe(userData.address);
      expect(user.answer).toBe(userData.answer);
      expect(user.role).toBe(0);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    test("should retrieve existing users from the database", async () => {
      const userData = {
        name: "existing user",
        email: "existing@test.com",
        password: "hashedpass",
        phone: "81234567",
        address: "123 Street",
        answer: "answer",
      };

      await new userModel(userData).save();
      const found = await userModel.findOne({ email: "existing@test.com" });

      expect(found).not.toBeNull();
      expect(found.name).toBe("existing user");
      expect(found.email).toBe("existing@test.com");
    });

    test("should return null when querying a non-existent email", async () => {
      const found = await userModel.findOne({ email: "nonexistent@test.com" });
      expect(found).toBeNull();
    });

    test("should assign default role of 0 for new users", async () => {
      const user = await new userModel({
        name: "Default Role User",
        email: "defaultrole@test.com",
        password: "hashed",
        phone: "12345678",
        address: "addr",
        answer: "ans",
      }).save();

      expect(user.role).toBe(0);
    });

    test("should generate timestamps on creation", async () => {
      const user = await new userModel({
        name: "Timestamp User",
        email: "timestamp@test.com",
        password: "hashed",
        phone: "12345678",
        address: "addr",
        answer: "ans",
      }).save();

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("Schema Validation (Required Fields)", () => {
    test("should reject user without name", async () => {
      const user = new userModel({
        email: "noname@test.com",
        password: "hashed",
        phone: "12345678",
        address: "addr",
        answer: "ans",
      });

      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test("should reject user without email", async () => {
      const user = new userModel({
        name: "No Email",
        password: "hashed",
        phone: "12345678",
        address: "addr",
        answer: "ans",
      });

      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test("should reject user without password", async () => {
      const user = new userModel({
        name: "No Password",
        email: "nopass@test.com",
        phone: "12345678",
        address: "addr",
        answer: "ans",
      });

      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test("should reject user without phone", async () => {
      const user = new userModel({
        name: "No Phone",
        email: "nophone@test.com",
        password: "hashed",
        address: "addr",
        answer: "ans",
      });

      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test("should reject user without address", async () => {
      const user = new userModel({
        name: "No Address",
        email: "noaddr@test.com",
        password: "hashed",
        phone: "12345678",
        answer: "ans",
      });

      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test("should reject user without answer", async () => {
      const user = new userModel({
        name: "No Answer",
        email: "noanswer@test.com",
        password: "hashed",
        phone: "12345678",
        address: "addr",
      });

      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  describe("Unique Email Constraint", () => {
    test("should reject duplicate email addresses", async () => {
      await new userModel({
        name: "First User",
        email: "duplicate@test.com",
        password: "hashed1",
        phone: "11111111",
        address: "addr1",
        answer: "ans1",
      }).save();

      const duplicateUser = new userModel({
        name: "Second User",
        email: "duplicate@test.com",
        password: "hashed2",
        phone: "22222222",
        address: "addr2",
        answer: "ans2",
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    test("should allow different email addresses", async () => {
      await new userModel({
        name: "User A",
        email: "usera@test.com",
        password: "hashed1",
        phone: "11111111",
        address: "addr1",
        answer: "ans1",
      }).save();

      const userB = await new userModel({
        name: "User B",
        email: "userb@test.com",
        password: "hashed2",
        phone: "22222222",
        address: "addr2",
        answer: "ans2",
      }).save();

      expect(userB._id).toBeDefined();
      expect(userB.email).toBe("userb@test.com");
    });
  });

  describe("Name Trimming Behavior", () => {
    test("should trim whitespace from name field", async () => {
      const user = await new userModel({
        name: "  Padded Name  ",
        email: "trim@test.com",
        password: "hashed",
        phone: "12345678",
        address: "addr",
        answer: "ans",
      }).save();

      expect(user.name).toBe("Padded Name");
    });
  });
});


/**
 * phase 2 tests for authHelper functions and their integration with bcrypt
 * **/

describe("Phase 2: authHelper ↔ bcrypt Integration", () => {
  // Tay Kai Jun, A0283343E

  describe("hashPassword Integration", () => {
    test("should hash a password and return a different string", async () => {
      const plainPassword = "SecurePass123";
      const hashed = await hashPassword(plainPassword);

      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe("string");
      expect(hashed).not.toBe(plainPassword);
      expect(hashed.length).toBeGreaterThan(0);
    });

    test("should produce a bcrypt-format hash (starts with $2b$)", async () => {
      const hashed = await hashPassword("TestPassword");
      expect(hashed).toMatch(/^\$2[aby]\$/);
    });

    test("should generate different hashes for the same password", async () => {
      const password = "SamePassword";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    test("should generate different hashes for different passwords", async () => {
      const hash1 = await hashPassword("PasswordOne");
      const hash2 = await hashPassword("PasswordTwo");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("hashPassword + comparePassword", () => {
    test("should verify a password against its own hash", async () => {
      const plainPassword = "MySecret123";
      const hashed = await hashPassword(plainPassword);
      const isMatch = await comparePassword(plainPassword, hashed);

      expect(isMatch).toBe(true);
    });

    test("should reject a wrong password against a hash", async () => {
      const hashed = await hashPassword("CorrectPassword");
      const isMatch = await comparePassword("WrongPassword", hashed);

      expect(isMatch).toBe(false);
    });
  });
});

/**
 * Phase 3: registerController + userModel + authHelper Integration
 * **/

describe("Phase 3: registerController + userModel + authHelper Integration", () => {
  // Tay Kai Jun, A0283343E

  describe("Successful Registration Flow (End-to-End through Controller)", () => {
    test("should register a new user, hash password, persist to DB, and return 201", async () => {
      const req = createFakeRequest({ ...validUserData });
      const res = createFakeResponse();

      await registerController(req, res);

      // Verify HTTP response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User registered successfully",
        })
      );

      // Verify user was actually persisted in the database
      const dbUser = await userModel.findOne({ email: validUserData.email });
      expect(dbUser).not.toBeNull();
      expect(dbUser.name).toBe(validUserData.name);
      expect(dbUser.email).toBe(validUserData.email);
      expect(dbUser.phone).toBe(validUserData.phone);
      expect(dbUser.address).toBe(validUserData.address);
      expect(dbUser.answer).toBe(validUserData.answer);
    });

    test("should store hashed password in the database", async () => {
      const req = createFakeRequest({ ...validUserData });
      const res = createFakeResponse();

      await registerController(req, res);

      const dbUser = await userModel.findOne({ email: validUserData.email });
      expect(dbUser.password).not.toBe(validUserData.password);
      expect(dbUser.password).toMatch(/^\$2[aby]\$/); // bcrypt format

      // Verify the hashed password actually matches the original
      const isMatch = await comparePassword(validUserData.password, dbUser.password);
      expect(isMatch).toBe(true);
    });

    test("should return the saved user object in the response", async () => {
      const req = createFakeRequest({ ...validUserData });
      const res = createFakeResponse();

      await registerController(req, res);

      const responsePayload = res.send.mock.calls[0][0];
      expect(responsePayload.user).toBeDefined();
      expect(responsePayload.user._id).toBeDefined();
      expect(responsePayload.user.name).toBe(validUserData.name);
      expect(responsePayload.user.email).toBe(validUserData.email);
    });

    test("should assign default role 0 to newly registered user", async () => {
      const req = createFakeRequest({ ...validUserData });
      const res = createFakeResponse();

      await registerController(req, res);

      const dbUser = await userModel.findOne({ email: validUserData.email });
      expect(dbUser.role).toBe(0);
    });
  });

  describe("Duplicate User test (Controller + Database)", () => {
    test("should reject registration when email already exists in database", async () => {
      // First registration — seed the database with a real user
      await new userModel({
        name: "Existing User",
        email: "existing@test.com",
        password: await hashPassword("password123"),
        phone: "99999999",
        address: "Existing Address",
        answer: "existing answer",
      }).save();

      // Attempt to register with the same email via the controller
      const req = createFakeRequest({
        ...validUserData,
        email: "existing@test.com",
      });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Already registered please login",
      });

      // Verify only one user with that email in DB
      const count = await userModel.countDocuments({ email: "existing@test.com" });
      expect(count).toBe(1);
    });

    test("should allow registration with a different email after a duplicate is rejected", async () => {
      // Seed existing user
      await new userModel({
        name: "First User",
        email: "taken@test.com",
        password: await hashPassword("password123"),
        phone: "88888888",
        address: "Some Address",
        answer: "some answer",
      }).save();

      // Register with a new, different email
      const req = createFakeRequest({
        ...validUserData,
        email: "newemail@test.com",
      });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );

      const dbUser = await userModel.findOne({ email: "newemail@test.com" });
      expect(dbUser).not.toBeNull();
    });
  });

  describe("Field Validation (Controller Validates Before DB Interaction)", () => {
    test("should return error for missing name without touching the database", async () => {
      const req = createFakeRequest({ ...validUserData, name: "" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ error: "Name is required" });

      // DB should not have any users
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    test("should return error for missing email without touching the database", async () => {
      const req = createFakeRequest({ ...validUserData, email: "" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Email is required" });
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    test("should return error for missing password without touching the database", async () => {
      const req = createFakeRequest({ ...validUserData, password: "" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Password is required" });
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    test("should return error for missing phone without touching the database", async () => {
      const req = createFakeRequest({ ...validUserData, phone: "" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Phone number is required" });
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    test("should return error for missing address without touching the database", async () => {
      const req = createFakeRequest({ ...validUserData, address: "" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Address is required" });
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    test("should return error for missing answer without touching the database", async () => {
      const req = createFakeRequest({ ...validUserData, answer: "" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Answer is required" });
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    test("should return error for invalid email format without touching the database", async () => {
      const req = createFakeRequest({ ...validUserData, email: "notanemail" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Email must be a valid format" });
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    test("should return error for non-numeric phone without touching the database", async () => {
      const req = createFakeRequest({ ...validUserData, phone: "abc-123" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Phone number must contain only numbers" });
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    test("should return error for password shorter than 6 characters", async () => {
      const req = createFakeRequest({ ...validUserData, password: "Ab1" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Password must be at least 6 characters long" });
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });
  });

  describe("Data Integrity (Controller and Database )", () => {
    test("should persist the exact values provided in the registration form", async () => {
      const specificData = {
        name: "Specific User",
        email: "specific@nus.edu.sg",
        password: "StrongPass99",
        phone: "65432100",
        address: "13 Computing Drive, NUS",
        answer: "My pet name is Whiskers",
      };

      const req = createFakeRequest(specificData);
      const res = createFakeResponse();

      await registerController(req, res);

      const dbUser = await userModel.findOne({ email: "specific@nus.edu.sg" });
      expect(dbUser.name).toBe(specificData.name);
      expect(dbUser.email).toBe(specificData.email);
      expect(dbUser.phone).toBe(specificData.phone);
      expect(dbUser.address).toBe(specificData.address);
      expect(dbUser.answer).toBe(specificData.answer);
      // Password should be hashed, not plaintext
      expect(dbUser.password).not.toBe(specificData.password);
    });

    test("should create exactly one user document per successful registration", async () => {
      const req = createFakeRequest({ ...validUserData });
      const res = createFakeResponse();

      await registerController(req, res);

      const count = await userModel.countDocuments();
      expect(count).toBe(1);
    });

    test("should not create a user when validation fails (no partial writes)", async () => {
      const invalidRequests = [
        { ...validUserData, name: "" },
        { ...validUserData, email: "bad-email" },
        { ...validUserData, password: "12" },
        { ...validUserData, phone: "not-a-number" },
      ];

      for (const body of invalidRequests) {
        const req = createFakeRequest(body);
        const res = createFakeResponse();
        await registerController(req, res);
      }

      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });
  });

  describe("Multiple Sequential Registrations", () => {
    test("should register multiple distinct users successfully", async () => {
      const users = [
        { ...validUserData, name: "User One", email: "user1@test.com" },
        { ...validUserData, name: "User Two", email: "user2@test.com" },
        { ...validUserData, name: "User Three", email: "user3@test.com" },
      ];

      for (const userData of users) {
        const req = createFakeRequest(userData);
        const res = createFakeResponse();
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
      }

      const count = await userModel.countDocuments();
      expect(count).toBe(3);
    });

    test("should handle a mix of valid and duplicate registrations correctly", async () => {
      // First registration — success
      const req1 = createFakeRequest({ ...validUserData, email: "first@test.com" });
      const res1 = createFakeResponse();
      await registerController(req1, res1);
      expect(res1.status).toHaveBeenCalledWith(201);

      // Second registration — duplicate, should fail
      const req2 = createFakeRequest({ ...validUserData, email: "first@test.com" });
      const res2 = createFakeResponse();
      await registerController(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(200);
      expect(res2.send).toHaveBeenCalledWith({
        success: false,
        message: "Already registered please login",
      });

      // Third registration — new email, should succeed
      const req3 = createFakeRequest({ ...validUserData, email: "second@test.com" });
      const res3 = createFakeResponse();
      await registerController(req3, res3);
      expect(res3.status).toHaveBeenCalledWith(201);

      const count = await userModel.countDocuments();
      expect(count).toBe(2);
    });
  });

  describe("Password Security (Controller + Helper + Database)", () => {
    test("should store a hashed password that can be verified with comparePassword", async () => {
      const password = "TestPassword789";
      const req = createFakeRequest({ ...validUserData, password });
      const res = createFakeResponse();

      await registerController(req, res);

      const dbUser = await userModel.findOne({ email: validUserData.email });

      // The stored password should be verifiable
      const isMatch = await comparePassword(password, dbUser.password);
      expect(isMatch).toBe(true);

      // A wrong password should not match
      const isWrongMatch = await comparePassword("WrongPassword", dbUser.password);
      expect(isWrongMatch).toBe(false);
    });

    test("should produce unique hashes for two users with the same password", async () => {
      const sharedPassword = "SamePassword123";

      const req1 = createFakeRequest({
        ...validUserData,
        email: "user1@test.com",
        password: sharedPassword,
      });
      const res1 = createFakeResponse();
      await registerController(req1, res1);

      const req2 = createFakeRequest({
        ...validUserData,
        email: "user2@test.com",
        password: sharedPassword,
      });
      const res2 = createFakeResponse();
      await registerController(req2, res2);

      const user1 = await userModel.findOne({ email: "user1@test.com" });
      const user2 = await userModel.findOne({ email: "user2@test.com" });

      // Same password but different hashes due to bcrypt salt
      expect(user1.password).not.toBe(user2.password);

      // Both should still verify correctly
      expect(await comparePassword(sharedPassword, user1.password)).toBe(true);
      expect(await comparePassword(sharedPassword, user2.password)).toBe(true);
    });
  });

  describe("Edge Cases (Boundary Value Analysis)", () => {
    test("should accept password with exactly 6 characters (boundary)", async () => {
      const req = createFakeRequest({ ...validUserData, password: "Pass12" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const dbUser = await userModel.findOne({ email: validUserData.email });
      expect(dbUser).not.toBeNull();
    });

    test("should reject password with exactly 5 characters (boundary)", async () => {
      const req = createFakeRequest({ ...validUserData, password: "Pas12" });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        message: "Password must be at least 6 characters long",
      });
      const count = await userModel.countDocuments();
      expect(count).toBe(0);
    });

    test("should handle a very long email address", async () => {
      const longEmail = "a".repeat(50) + "@" + "b".repeat(50) + ".com";
      const req = createFakeRequest({ ...validUserData, email: longEmail });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const dbUser = await userModel.findOne({ email: longEmail });
      expect(dbUser).not.toBeNull();
    });

    test("should handle a very long password", async () => {
      const longPassword = "A".repeat(200);
      const req = createFakeRequest({ ...validUserData, password: longPassword });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const dbUser = await userModel.findOne({ email: validUserData.email });
      const isMatch = await comparePassword(longPassword, dbUser.password);
      expect(isMatch).toBe(true);
    });

    test("should handle special characters in user data fields", async () => {
      const specialData = {
        name: "O'Brien-Smith Jr.",
        email: "obriensmith@test.com",
        password: "P@$$w0rd!#%",
        phone: "12345678",
        address: "Apt #3, Bldg 5/F, 123 St & Ave",
        answer: "It's my mother's maiden name: O'Brien",
      };

      const req = createFakeRequest(specialData);
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const dbUser = await userModel.findOne({ email: specialData.email });
      expect(dbUser.name).toBe(specialData.name);
      expect(dbUser.address).toBe(specialData.address);
      expect(dbUser.answer).toBe(specialData.answer);
    });
  });

  describe("Error Handling (Controller catch block with DB)", () => {
    test("should return 500 when database connection is interrupted during findOne", async () => {
    
      const originalFindOne = userModel.findOne;
      jest.spyOn(userModel, "findOne").mockRejectedValueOnce(new Error("DB connection lost"));
      jest.spyOn(console, "log").mockImplementation(() => {});

      const req = createFakeRequest({ ...validUserData });
      const res = createFakeResponse();

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while registering user",
        })
      );

      // Restore
      userModel.findOne.mockRestore();
      console.log.mockRestore();
    });
  });
});

/**
 *  Phase 4: Express Route Integration (Sandwich Approach)
 * **/
describe("Phase 4: Express Route Integration (Sandwich Approach)", () => {
  // Tay Kai Jun, A0283343E

  let app;

  beforeAll(async () => {
    const express = (await import("express")).default;
    app = express();
    app.use(express.json());

    // Mount the auth register route
    const authRouteModule = await import("../../../routes/authRoute.js");
    const authRoutes = authRouteModule.default?.default ?? authRouteModule.default;
    app.use("/api/v1/auth", authRoutes);
  });

  it("should handle a registration request through the full Express route stack", async () => {
    // Use the Express app to process a real-ish HTTP cycle
    // We invoke the route handler chain through the app's internal routing
    const req = createFakeRequest({ ...validUserData, email: "express@test.com" });
    const res = createFakeResponse();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );

    // Verify persisted in DB
    const dbUser = await userModel.findOne({ email: "express@test.com" });
    expect(dbUser).not.toBeNull();
    expect(dbUser.name).toBe(validUserData.name);
  });

  it("should prevent duplicate registration through the route layer", async () => {
    // Seed a user directly in DB
    await new userModel({
      name: "Route Test User",
      email: "routedup@test.com",
      password: await hashPassword("password123"),
      phone: "12345678",
      address: "Route Address",
      answer: "route answer",
    }).save();

    const req = createFakeRequest({
      ...validUserData,
      email: "routedup@test.com",
    });
    const res = createFakeResponse();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Already registered please login",
    });
  });
});
