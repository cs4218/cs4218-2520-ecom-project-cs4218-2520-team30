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

jest.spyOn(userModel, 'findOne');
jest.spyOn(userModel, 'findById');
jest.spyOn(userModel, 'findByIdAndUpdate');


jest.spyOn(userModel.prototype, 'save').mockImplementation(function () {
  return Promise.resolve({
    _id: "mockUserId123",
    ...this,
  });
});

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-testing";
});

beforeEach(() => {
  jest.clearAllMocks();

  userModel.findOne.mockResolvedValue(null);
  userModel.findById.mockResolvedValue(null);
  userModel.findByIdAndUpdate.mockResolvedValue(null);
  userModel.prototype.save.mockImplementation(function () {
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
 * Test loginController 
 * Testing Type: Communication-based
 **/
describe("Auth Controller - Login", () => {

  describe("Input Validation", () => {
    test("expected to return error when both email and password are missing", async () => {      
      // Arrange
      const fakeReq = createFakeRequest({ body: {} });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email and password are required",
      });
    });

    test("expected to return error when email is missing", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { password: "password123" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is required",
      });
    });

    test("expected to return error when password is missing", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { email: "test@test.com" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Password is required",
      });
    });


    test("expected to return error when email is empty string", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { email: "", password: "password123" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is required",
      });
    });

    test("expected to return error when password is empty string", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { email: "test@test.com", password: "" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Password is required",
      });
    });
  });

  describe("Email Format Validation", () => {
    test("expected to return error when email format is invalid", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { email: "invalidemail", password: "password123" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email must be a valid format",
      });
    });

    test("expected to return error when email is missing @ symbol", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { email: "invalidemail.com", password: "password123" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email must be a valid format",
      });
    });

    test("expected to return error when email has multiple @ symbols", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { email: "test@@example.com", password: "password123" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email must be a valid format",
      });
    });

    test("expected to return error when email is missing domain", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { email: "test@", password: "password123" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email must be a valid format",
      });
    });
  });

  describe("Password Length Validation", () => {
    test("expected to return error when password is less than 6 characters", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { email: "test@test.com", password: "12345" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    });

    test("expected to return error when password is exactly 5 characters", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { email: "test@test.com", password: "Pass1" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    });

    test("expected to return error when password is 1 character", async () => {
      
      // Arrange
      const fakeReq = createFakeRequest({ body: { email: "test@test.com", password: "1" } });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    });
  });

  describe("User Not Found", () => {
    test("expected to return error when user does not exist", async () => {
      
      // Arrange
      userModel.findOne.mockResolvedValueOnce(null);
      const fakeReq = createFakeLoginRequest({ email: "nouser@test.com" });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "nouser@test.com" });
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registered",
      });
      expect(comparePassword).not.toHaveBeenCalled();
    });

    test("expected to return error when trying to login with unregistered email", async () => {
      
      // Arrange
      userModel.findOne.mockResolvedValueOnce(null);
      const fakeReq = createFakeLoginRequest({ email: "newuser@example.com" });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "newuser@example.com" });
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registered",
      });
    });
  });

  describe("Invalid Password", () => {
    test("expected to return error when password does not match", async () => {
    
      // Arrange
      const mockUser = {
        _id: "userId123",
        email: "john@test.com",
        password: "hashed_password",
        name: "John Doe",
        phone: "1234567890",
        address: "123 Street",
        role: 0,
      };
      userModel.findOne.mockResolvedValueOnce(mockUser);
      comparePassword.mockResolvedValueOnce(false);
      const fakeReq = createFakeLoginRequest({ password: "wrongpassword" });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "john@test.com" });
      expect(comparePassword).toHaveBeenCalledWith("wrongpassword", "hashed_password");
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid password",
      });
      expect(JWT.sign).not.toHaveBeenCalled();
    });

    test("expected to return error when password is completely incorrect", async () => {
      
      // Arrange
      const mockUser = {
        _id: "userId456",
        email: "jane@test.com",
        password: "hashed_correct_password",
        name: "Jane Doe",
        phone: "0987654321",
        address: "456 Street",
        role: 0,
      };
      userModel.findOne.mockResolvedValueOnce(mockUser);
      comparePassword.mockResolvedValueOnce(false);
      const fakeReq = createFakeLoginRequest({ email: "jane@test.com", password: "totallyWrong" });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(comparePassword).toHaveBeenCalledWith("totallyWrong", "hashed_correct_password");
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid password",
      });
    });

    test("expected to return error when password has misspelling", async () => {

      // Arrange
      const mockUser = {
        _id: "userId789",
        email: "user@test.com",
        password: "hashed_password",
        name: "Test User",
        phone: "1231231234",
        address: "789 Street",
        role: 0,
      };
      userModel.findOne.mockResolvedValueOnce(mockUser);
      comparePassword.mockResolvedValueOnce(false);
      const fakeReq = createFakeLoginRequest({ email: "user@test.com", password: "password1234" });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(comparePassword).toHaveBeenCalledWith("password1234", "hashed_password");
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid password",
      });
      expect(JWT.sign).not.toHaveBeenCalled();
    });
  });

  describe("Successful Login", () => {
    test("expected to login successfully and return token", async () => {
      
      // Arrange
      const mockUser = {
        _id: "userId123",
        email: "john@test.com",
        password: "hashed_password",
        name: "John Doe",
        phone: "1234567890",
        address: "123 Street",
        role: 0,
      };
      userModel.findOne.mockResolvedValueOnce(mockUser);
      comparePassword.mockResolvedValueOnce(true);
      JWT.sign.mockReturnValue("mock_jwt_token_12345");
      const fakeReq = createFakeLoginRequest();
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "john@test.com" });
      expect(comparePassword).toHaveBeenCalledWith("password123", "hashed_password");
      expect(JWT.sign).toHaveBeenCalledWith(
        { _id: "userId123" },
        "test-secret-key-for-testing",
        { expiresIn: "7d" }
      );
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login successfully",
          user: expect.objectContaining({
            _id: "userId123",
            name: "John Doe",
            email: "john@test.com",
          }),
          token: "mock_jwt_token_12345",
        })
      );
    });

    test("expected to login successfully with different user credentials", async () => {
      
      // Arrange
      const mockUser = {
        _id: "userId999",
        email: "alicetest@example.com",
        password: "hashed_alice_password",
        name: "Alice Smith",
        phone: "5555555555",
        address: "999 test St",
        role: 0,
      };
      userModel.findOne.mockResolvedValueOnce(mockUser);
      comparePassword.mockResolvedValueOnce(true);
      JWT.sign.mockReturnValue("alice_test_token_xyz");
      const fakeReq = createFakeLoginRequest({ email: "alicetest@example.com", password: "alicePassword" });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "alicetest@example.com" });
      expect(comparePassword).toHaveBeenCalledWith("alicePassword", "hashed_alice_password");
      expect(JWT.sign).toHaveBeenCalledWith(
        { _id: "userId999" },
        "test-secret-key-for-testing",
        { expiresIn: "7d" }
      );
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login successfully",
          user: expect.objectContaining({
            _id: "userId999",
            name: "Alice Smith",
            email: "alicetest@example.com",
          }),
          token: "alice_test_token_xyz",
        })
      );
    });

    test("expected to login successfully as admin user", async () => {
      
      // Arrange
      const mockAdminUser = {
        _id: "adminId001",
        email: "admin@test.com",
        password: "hashed_admin_password",
        name: "Admin User",
        phone: "9999999999",
        address: "Admin Office",
        role: 1,
      };
      userModel.findOne.mockResolvedValueOnce(mockAdminUser);
      comparePassword.mockResolvedValueOnce(true);
      JWT.sign.mockReturnValue("admin_test_token_abc");
      const fakeReq = createFakeLoginRequest({ email: "admin@test.com", password: "adminPass123" });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "admin@test.com" });
      expect(comparePassword).toHaveBeenCalledWith("adminPass123", "hashed_admin_password");
      expect(JWT.sign).toHaveBeenCalledWith(
        { _id: "adminId001" },
        "test-secret-key-for-testing",
        { expiresIn: "7d" }
      );
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login successfully",
          user: expect.objectContaining({
            _id: "adminId001",
            name: "Admin User",
            email: "admin@test.com",
            role: 1,
          }),
          token: "admin_test_token_abc",
        })
      );
    });

    test("expected to exclude password from user data in response", async () => {
      
      // Arrange
      const mockUser = {
        _id: "userId555",
        email: "test@test.com",
        password: "hashed_password",
        name: "Test User",
        phone: "1234567890",
        address: "123 Street",
        role: 0,
      };
      userModel.findOne.mockResolvedValueOnce(mockUser);
      comparePassword.mockResolvedValueOnce(true);
      JWT.sign.mockReturnValue("test_token");
      const fakeReq = createFakeLoginRequest({ email: "test@test.com", password: "testPassword" });
      const fakeRes = createFakeResponse();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.not.objectContaining({
            password: expect.anything(),
          }),
        })
      );
    });
  });
});

describe("Auth Controller - Database Error Handling", () => {

  describe("Login Error", () => {
    test("expected to handle database error during login", async () => {

      // Arrange
      userModel.findOne.mockClear();
      userModel.findOne.mockRejectedValueOnce(
        new Error("Database connection failed")
      );
      const fakeReq = createFakeLoginRequest();
      const fakeRes = createFakeResponse();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in login",
        })
      );
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test("expected to handle network timeout error during login", async () => {
      
      // Arrange
      userModel.findOne.mockRejectedValueOnce(
        new Error("Network timeout")
      );
      const fakeReq = createFakeLoginRequest();
      const fakeRes = createFakeResponse();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await loginController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in login",
        })
      );
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
