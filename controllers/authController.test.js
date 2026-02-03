import { jest, describe, beforeEach, beforeAll, afterAll, it, expect } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import { 
  registerController, 
  loginController, 
  forgotPasswordController,
  testController
} from "./authController.js";

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret-key-for-testing";
  
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});


const createFakeRequest = ({ body = {}, params = {}, query = {} } = {}) => ({
  body,
  params,
  query,
});

/**
 * FAKE Response
 */
const createFakeResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create fake registration request with default values
 */
const createFakeRegisterRequest = (overrides = {}) =>
  createFakeRequest({
    body: {
      name: "John Doe",
      email: "john@test.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Test Street",
      answer: "test answer",
      ...overrides,
    },
  });

/**
 * Create fake login req with default values
 */
const createFakeLoginRequest = (overrides = {}) =>
  createFakeRequest({
    body: {
      email: "john@test.com",
      password: "password123",
      ...overrides,
    },
  });

/**
 * Create fake forgot password req
 */
const createFakeForgotPasswordRequest = (overrides = {}) =>
  createFakeRequest({
    body: {
      email: "john@test.com",
      answer: "test answer",
      newPassword: "newPassword123",
      ...overrides,
    },
  });

/**
 * Helper to create a test user and return the user document
 */
const createTestUser = async (overrides = {}) => {
  const fakeReq = createFakeRegisterRequest(overrides);
  const fakeRes = createFakeResponse();
  await registerController(fakeReq, fakeRes);
  return await userModel.findOne({ email: overrides.email || "john@test.com" });
};

/**
 * Test registerController
 * **/
describe("Auth Controller - Registration", () => {
  describe("Input Validation", () => {
    test("expected to return error when name is missing", async () => {
      const fakeReq = createFakeRequest({
        body: {
          email: "test@test.com",
          password: "password123",
          phone: "1234567890",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    test("expected to return error when email is missing", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          password: "password123",
          phone: "1234567890",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Email is Required" });
    });

    test("expected to return error when password is missing", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "test@test.com",
          phone: "1234567890",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Password is Required" });
    });

    test("expected to return error when phone is missing", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "test@test.com",
          password: "password123",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Phone no is Required" });
    });

    test("expected to return error when address is missing", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "test@test.com",
          password: "password123",
          phone: "1234567890",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Address is Required" });
    });

    test("expected to return error when answer is missing", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "test@test.com",
          password: "password123",
          phone: "1234567890",
          address: "123 Street",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Answer is Required" });
    });
  });

/**
 * Existing User Check for Registration
 * **/
  describe("Existing User Check for Registration", () => {
    test("expected to return error when user already exists", async () => {
      // MOCK: Simulate userModel.findOne returning an existing user
      const findOneSpy = jest.spyOn(userModel, "findOne").mockResolvedValueOnce({
        _id: "existingUserId",
        email: "existing@test.com",
        name: "Existing User",
      });

      const fakeReq = createFakeRegisterRequest({ email: "existing@test.com" });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(findOneSpy).toHaveBeenCalledWith({ email: "existing@test.com" });
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Already Register please login",
      });

      findOneSpy.mockRestore();
    });
  });

  // ============================================
  // SUCCESSFUL REGISTRATION
  // ============================================
  describe("Successful Registration", () => {
    test("expected to register user successfully with hashed password", async () => {
      const fakeReq = createFakeRegisterRequest();
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(201);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User Register Successfully",
        })
      );

      // Verify user was saved to database
      const savedUser = await userModel.findOne({ email: "john@test.com" });
      expect(savedUser).toBeTruthy();
      expect(savedUser.name).toBe("John Doe");
      // Password should be hashed (not plain text)
      expect(savedUser.password).not.toBe("password123");
    });
  });
});

// ============================================
// LOGIN CONTROLLER TESTS
// ============================================
describe("Auth Controller - Login", () => {
  // Create a user before login tests
  beforeEach(async () => {
    const fakeReq = createFakeRegisterRequest();
    const fakeRes = createFakeResponse();
    await registerController(fakeReq, fakeRes);
  });

  describe("Input Validation", () => {
    test("expected to return error when email is missing", async () => {
      const fakeReq = createFakeRequest({ body: { password: "password123" } });
      const fakeRes = createFakeResponse();

      await loginController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    test("expected to return error when password is missing", async () => {
      const fakeReq = createFakeRequest({ body: { email: "test@test.com" } });
      const fakeRes = createFakeResponse();

      await loginController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe("User Not Found", () => {
    test("expected to return error when user does not exist", async () => {
      const fakeReq = createFakeLoginRequest({ email: "nonexistent@test.com" });
      const fakeRes = createFakeResponse();

      await loginController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registerd",
      });
    });
  });

  describe("Invalid Password", () => {
    test("expected to return error when password does not match", async () => {
      const fakeReq = createFakeLoginRequest({ password: "wrongpassword" });
      const fakeRes = createFakeResponse();

      await loginController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Password",
      });
    });
  });

  describe("Successful Login", () => {
    test("expected to login successfully and return token", async () => {
      const fakeReq = createFakeLoginRequest();
      const fakeRes = createFakeResponse();

      await loginController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "login successfully",
        })
      );
    });
  });
});

// ============================================
// FORGOT PASSWORD CONTROLLER TESTS
// ============================================
describe("Auth Controller - Forgot Password", () => {
  // Create a user before forgot password tests
  beforeEach(async () => {
    const fakeReq = createFakeRegisterRequest();
    const fakeRes = createFakeResponse();
    await registerController(fakeReq, fakeRes);
  });

  describe("Input Validation", () => {
    test("expected to return error when email is missing", async () => {
      const fakeReq = createFakeRequest({
        body: { answer: "test answer", newPassword: "newPass123" },
      });
      const fakeRes = createFakeResponse();

      await forgotPasswordController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Emai is required" });
    });

    test("expected to return error when answer is missing", async () => {
      const fakeReq = createFakeRequest({
        body: { email: "john@test.com", newPassword: "newPass123" },
      });
      const fakeRes = createFakeResponse();

      await forgotPasswordController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "answer is required" });
    });

    test("expected to return error when newPassword is missing", async () => {
      const fakeReq = createFakeRequest({
        body: { email: "john@test.com", answer: "test answer" },
      });
      const fakeRes = createFakeResponse();

      await forgotPasswordController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "New Password is required" });
    });
  });

  describe("User Verification", () => {
    test("expected to return error when email/answer combination is wrong", async () => {
      const fakeReq = createFakeForgotPasswordRequest({ answer: "WrongAnswer" });
      const fakeRes = createFakeResponse();

      await forgotPasswordController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong Email Or Answer",
      });
    });
  });

  describe("Successful Password Reset", () => {
    test("expected to reset password successfully", async () => {
      const fakeReq = createFakeForgotPasswordRequest();
      const fakeRes = createFakeResponse();

      await forgotPasswordController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Password Reset Successfully",
      });

      // Verify can login with new password
      const loginReq = createFakeLoginRequest({ password: "newPassword123" });
      const loginRes = createFakeResponse();
      await loginController(loginReq, loginRes);

      expect(loginRes.status).toHaveBeenCalledWith(200);
      expect(loginRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "login successfully",
        })
      );
    });
  });
});

// ============================================
// TEST CONTROLLER TESTS
// ============================================
describe("Auth Controller - Test Controller", () => {
  describe("Protected Route Test", () => {
    test("expected to return protected routes message", () => {
      const fakeReq = createFakeRequest();
      const fakeRes = createFakeResponse();

      testController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith("Protected Routes");
    });

    test("expected to handle error in testController", () => {
      const fakeReq = createFakeRequest();
      const fakeRes = {
        send: jest.fn().mockImplementationOnce(() => {
          throw new Error("Response send failed");
        }),
      };

      testController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledTimes(2);
      expect(fakeRes.send).toHaveBeenLastCalledWith(
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });
});

// ============================================
// FORGOT PASSWORD CONTROLLER ERROR HANDLING TESTS
// ============================================
describe("Auth Controller - Forgot Password Error Handling", () => {
  describe("Error Handling", () => {
    it("should handle error when newPassword is empty string", async () => {
      // First create a user
      await createTestUser();

      const fakeReq = {
        body: {
          email: "testuser@example.com",
          answer: "test-answer",
          newPassword: "",  // Empty password triggers validation error
        },
      };
      const fakeRes = createFakeResponse();

      await forgotPasswordController(fakeReq, fakeRes);

      // Empty string is falsy, so it returns 400 with message
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "New Password is required" });
    });
  });
});
// ============================================
// DATABASE ERROR HANDLING TESTS
// These tests use jest.spyOn to mock database failures
// to trigger the catch blocks for 100% statement coverage
// ============================================

describe("Auth Controller - Database Error Handling", () => {
  describe("Registration Error", () => {
    it("should handle database error during registration (catch block)", async () => {
      // Mock userModel.findOne to throw an error
      const findOneSpy = jest.spyOn(userModel, "findOne").mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const fakeReq = createFakeRegisterRequest();
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Errro in Registeration",
        })
      );

      findOneSpy.mockRestore();
    });
  });

  describe("Login Error", () => {
    it("should handle database error during login (catch block)", async () => {
      // Mock userModel.findOne to throw an error
      const findOneSpy = jest.spyOn(userModel, "findOne").mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const fakeReq = createFakeLoginRequest();
      const fakeRes = createFakeResponse();

      await loginController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in login",
        })
      );

      findOneSpy.mockRestore();
    });
  });

  describe("Forgot Password Error", () => {
    it("should handle database error during password reset (catch block)", async () => {
      // First create a user
      await createTestUser();

      // Mock userModel.findByIdAndUpdate to throw an error
      const findByIdAndUpdateSpy = jest.spyOn(userModel, "findByIdAndUpdate").mockRejectedValueOnce(
        new Error("Database update failed")
      );

      const fakeReq = createFakeForgotPasswordRequest();
      const fakeRes = createFakeResponse();

      await forgotPasswordController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Something went wrong",
        })
      );

      findByIdAndUpdateSpy.mockRestore();
    });
  });
});