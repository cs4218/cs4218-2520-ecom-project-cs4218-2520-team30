import { jest, describe, beforeEach, beforeAll, it, expect } from "@jest/globals";

jest.mock("../helpers/authHelper.js");

jest.mock("jsonwebtoken");

// Import everything
import userModel from "../models/userModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";
import { 
  registerController, 
  loginController, 
  forgotPasswordController,
  testController
} from "./authController.js";

// Create spies for userModel static methods
jest.spyOn(userModel, 'findOne');
jest.spyOn(userModel, 'findById');
jest.spyOn(userModel, 'findByIdAndUpdate');

// Mock the save method on the prototype
jest.spyOn(userModel.prototype, 'save').mockImplementation(function() {
  return Promise.resolve({
    _id: "mockUserId123",
    ...this,
  });
});

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-testing";
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  userModel.findOne.mockResolvedValue(null);
  userModel.findById.mockResolvedValue(null);
  userModel.findByIdAndUpdate.mockResolvedValue(null);
  userModel.prototype.save.mockImplementation(function() {
    return Promise.resolve({
      _id: "mockUserId123",
      ...this,
    });
  });
  hashPassword.mockResolvedValue("hashed_password");
  comparePassword.mockResolvedValue(true);
  JWT.sign.mockReturnValue("mock_token");
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
 * Test registerController
 * **/
describe("Auth Controller test Registration", () => {
  describe("Input validation for registration", () => {
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

      expect(fakeRes.send).toHaveBeenCalledWith({ error: "Name is required" });
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

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Email is required" });
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

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Password is required" });
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

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Phone no is required" });
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

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Address is required" });
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

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Answer is required" });
    });

    test("expected to return error when email format is invalid", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "invalidEmailFormat",
          password: "password123",
          phone: "1234567890",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Email must be a valid format" });
    });

    test("expected to return error when email is missing @ symbol", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "invalidemail.com",
          password: "password123",
          phone: "1234567890",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Email must be a valid format" });
    });

    test("expected to return error when phone number contains non-numeric characters", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "test@test.com",
          password: "password123",
          phone: "1234-5678",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Phone number must contain only numbers" });
    });

    test("expected to return error when phone number contains letters", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "test@test.com",
          password: "password123",
          phone: "12345abc90",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Phone number must contain only numbers" });
    });

    test("expected to return error when password is less than 6 characters", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "test@test.com",
          password: "12345",
          phone: "1234567890",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Password must be at least 6 characters long" });
    });

    test("expected to return error when password is exactly 5 characters", async () => {
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "test@test.com",
          password: "Pass1",
          phone: "1234567890",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Password must be at least 6 characters long" });
    });

    test("expected to accept password with exactly 6 characters", async () => {
      userModel.findOne.mockResolvedValueOnce(null);
      
      const fakeReq = createFakeRequest({
        body: {
          name: "John Doe",
          email: "test@test.com",
          password: "Pass12",
          phone: "1234567890",
          address: "123 Street",
          answer: "test answer",
        },
      });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(fakeRes.status).toHaveBeenCalledWith(201);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User registered successfully",
        })
      );
    });
  });

/**
 * Existing User Check for Registration
 * **/
  describe("Existing User Check for Registration", () => {
    test("expected to return error when user already exists", async () => {
      userModel.findOne.mockResolvedValueOnce({
        _id: "existingUserId",
        email: "existing@test.com",
        name: "Existing User",
      });

      const fakeReq = createFakeRegisterRequest({ email: "existing@test.com" });
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: "existing@test.com" });
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Already registered please login",
      });
      expect(hashPassword).not.toHaveBeenCalled();
    });
  });

  /**
   * Test Successful Registration
   * **/
  describe("Successful Registration", () => {
    test("expected to register user successfully with hashed password", async () => {
      userModel.findOne.mockResolvedValueOnce(null);
      
      hashPassword.mockResolvedValueOnce("hashed_password_123");
      
      const fakeReq = createFakeRegisterRequest();
      const fakeRes = createFakeResponse();

      await registerController(fakeReq, fakeRes);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: "john@test.com" });
      expect(hashPassword).toHaveBeenCalledWith("password123");
      expect(fakeRes.status).toHaveBeenCalledWith(201);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User registered successfully",
        })
      );
    });
  });
});

