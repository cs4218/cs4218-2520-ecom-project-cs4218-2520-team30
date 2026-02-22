import { jest, describe, beforeEach, beforeAll, it, expect, afterEach } from "@jest/globals";

jest.mock("../helpers/authHelper.js");

jest.mock("jsonwebtoken");

// Import everything
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";
import {
  getAllUsersController,
  registerController,
  loginController,
  forgotPasswordController,
  testController,
  orderStatusController,
  getAllOrdersController,
  getOrdersController,
  updateProfileController,
} from "./authController.js";

jest.mock("../models/orderModel.js");

jest.spyOn(userModel, 'findOne');
jest.spyOn(userModel, 'findById');
jest.spyOn(userModel, 'findByIdAndUpdate');
jest.spyOn(userModel, 'find');


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
  userModel.find.mockReturnValue(null);
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
 * Helper to assert login validation errors
 */
const expectLoginError = async (body, expectedStatus, expectedMessage) => {
  const fakeReq = createFakeRequest({ body });
  const fakeRes = createFakeResponse();
  await loginController(fakeReq, fakeRes);
  expect(fakeRes.status).toHaveBeenCalledWith(expectedStatus);
  expect(fakeRes.send).toHaveBeenCalledWith({
    success: false,
    message: expectedMessage,
  });
};

/**
 * Helper to assert registration validation errors
 */
const expectRegisterError = async (body, expectedMessage) => {
  const fakeReq = createFakeRequest({ body });
  const fakeRes = createFakeResponse();
  await registerController(fakeReq, fakeRes);
  expect(fakeRes.send).toHaveBeenCalledWith({
    message: expectedMessage,
  });
};



/**
 * Test registerController
 * Testing Type: Communication-based + Input validation
 **/
describe("Auth Controller - Register", () => {

  describe("Required Fields Validation", () => {
    //Tay Kai Jun, A0283343E
    test("should return error when missing name (API uses 'error' key)", async () => {
      const fakeReq = createFakeRequest({ body: { email: "test@test.com" } });
      const fakeRes = createFakeResponse();
      await registerController(fakeReq, fakeRes);
      expect(fakeRes.send).toHaveBeenCalledWith({ error: "Name is required" });
    });

    //Tay Kai Jun, A0283343E
    test.each([
      [{ name: "Test" }, "Email is required", "missing email"],
      [{ name: "Test", email: "test@test.com" }, "Password is required", "missing password"],
      [{ name: "Test", email: "test@test.com", password: "pass123" }, "Phone number is required", "missing phone"],
      [{ name: "Test", email: "test@test.com", password: "pass123", phone: "1234567890" }, "Address is required", "missing address"],
      [{ name: "Test", email: "test@test.com", password: "pass123", phone: "1234567890", address: "123 St" }, "Answer is required", "missing answer"],
    ])("should return error when %s", async (body, expectedMessage) => {
      await expectRegisterError(body, expectedMessage);
    });
  });

  describe("Email Format Validation", () => {
    //Tay Kai Jun, A0283343E
    test.each([
      ["invalidemail", "no @ or domain"],
      ["invalidemail.com", "missing @ symbol"],
      ["test@@example.com", "multiple @ symbols"],
      ["test@", "missing domain"],
      ["@example.com", "missing local part"],
      ["test@.com", "domain starts with dot"],
    ])("should return error when email is '%s' (%s)", async (email) => {
      const body = {
        name: "Test User",
        email,
        password: "password123",
        phone: "1234567890",
        address: "123 Test St",
        answer: "test answer",
      };
      await expectRegisterError(body, "Email must be a valid format");
    });
  });

  describe("Password Length Validation", () => {
    //Tay Kai Jun, A0283343E
    test("should return 'Password is required' when password is empty string", async () => {
      const body = {
        name: "Test User",
        email: "test@test.com",
        password: "",
        phone: "1234567890",
        address: "123 Test St",
        answer: "test answer",
      };
      await expectRegisterError(body, "Password is required");
    });

    //Tay Kai Jun, A0283343E
    test.each([
      ["1", "1 character (far below minimum)"],
      ["Pass1", "5 characters (just below minimum of 6)"],
      ["12345", "5 numeric characters"],
    ])("should return error when password is '%s' (%s)", async (password) => {
      const body = {
        name: "Test User",
        email: "test@test.com",
        password,
        phone: "1234567890",
        address: "123 Test St",
        answer: "test answer",
      };
      await expectRegisterError(body, "Password must be at least 6 characters long");
    });

    //Tay Kai Jun, A0283343E
    test("should accept password with exactly 6 characters", async () => {
      // Arrange
      const body = {
        name: "Test User",
        email: "new@test.com",
        password: "Pass12", // exactly 6 characters
        phone: "1234567890",
        address: "123 Test St",
        answer: "test answer",
      };
      userModel.findOne.mockResolvedValue(null);
      const fakeReq = createFakeRequest({ body });
      const fakeRes = createFakeResponse();

      // Act
      await registerController(fakeReq, fakeRes);

      // Assert
      expect(hashPassword).toHaveBeenCalledWith("Pass12");
      expect(fakeRes.status).toHaveBeenCalledWith(201);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User registered successfully",
        })
      );
    });
  });

  describe("Phone Number Validation", () => {
    //Tay Kai Jun, A0283343E
    test.each([
      ["abc123", "contains letters"],
      ["123-456-7890", "contains hyphens"],
      ["(123) 456-7890", "formatted with parentheses"],
      ["123 456 7890", "contains spaces"],
      ["+1234567890", "contains plus sign"],
    ])("should return error when phone is '%s' (%s)", async (phone) => {
      const body = {
        name: "Test User",
        email: "test@test.com",
        password: "password123",
        phone,
        address: "123 Test St",
        answer: "test answer",
      };
      await expectRegisterError(body, "Phone number must contain only numbers");
    });

    //Tay Kai Jun, A0283343E
    test("should accept valid numeric phone number", async () => {
      // Arrange
      const body = {
        name: "Test User",
        email: "newuser@test.com",
        password: "password123",
        phone: "9876543210",
        address: "123 Test St",
        answer: "test answer",
      };
      userModel.findOne.mockResolvedValue(null);
      const fakeReq = createFakeRequest({ body });
      const fakeRes = createFakeResponse();

      // Act
      await registerController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(201);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User registered successfully",
        })
      );
    });
  });

  describe("Duplicate User", () => {
    //Tay Kai Jun, A0283343E
    test("should return error when email already exists", async () => {
      // Arrange
      const existingUser = {
        _id: "user123",
        email: "existing@test.com",
        name: "Existing User",
      };
      userModel.findOne.mockResolvedValue(existingUser);
      const body = {
        name: "New User",
        email: "existing@test.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Test St",
        answer: "test answer",
      };
      const fakeReq = createFakeRequest({ body });
      const fakeRes = createFakeResponse();

      // Act
      await registerController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "existing@test.com" });
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Already registered please login",
      });
      expect(hashPassword).not.toHaveBeenCalled();
    });
  });

  describe("Successful Registration - Control Flow", () => {
    //Tay Kai Jun, A0283343E
    test("should register new user successfully", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashed_password_123");
      const mockSavedUser = {
        _id: "mockUserId123",
        name: "New User",
        email: "newuser@test.com",
        phone: "9876543210",
        address: "456 New St",
        password: "hashed_password_123",
        answer: "my answer",
      };
      userModel.prototype.save.mockResolvedValue(mockSavedUser);
      const body = {
        name: "New User",
        email: "newuser@test.com",
        password: "password123",
        phone: "9876543210",
        address: "456 New St",
        answer: "my answer",
      };
      const fakeReq = createFakeRequest({ body });
      const fakeRes = createFakeResponse();

      // Act
      await registerController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "newuser@test.com" });
      expect(hashPassword).toHaveBeenCalledWith("password123");
      expect(userModel.prototype.save).toHaveBeenCalled();
      expect(fakeRes.status).toHaveBeenCalledWith(201);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: true,
        message: "User registered successfully",
        user: mockSavedUser,
      });
    });

    //Tay Kai Jun, A0283343E
    test("should hash password before saving", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("super_secure_hash");
      const fakeReq = createFakeRegisterRequest({ password: "mypassword" });
      const fakeRes = createFakeResponse();

      // Act
      await registerController(fakeReq, fakeRes);

      // Assert
      expect(hashPassword).toHaveBeenCalledWith("mypassword");
    });
  });

  describe("Database Error Handling", () => {
    //Tay Kai Jun, A0283343E
    test("should handle database error during registration", async () => {
      // Arrange
      userModel.findOne.mockRejectedValue(new Error("Database connection failed"));
      const fakeReq = createFakeRegisterRequest();
      const fakeRes = createFakeResponse();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await registerController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while registering user",
        })
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    //Tay Kai Jun, A0283343E
    test("should handle error during password hashing", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockRejectedValue(new Error("Hashing failed"));
      const fakeReq = createFakeRegisterRequest();
      const fakeRes = createFakeResponse();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await registerController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while registering user",
        })
      );
      consoleSpy.mockRestore();
    });
  });
});

/**
 * Test loginController 
 * Testing Type: Communication-based
 **/
describe("Auth Controller - Login", () => {

  describe("Input Validation - Equivalence Partitions", () => {
    //Tay Kai Jun, A0283343E
    test.each([
      // Partition: both fields missing
      [{}, 400, "Email and password are required", "both email and password are missing"],
      // Partition: email missing, password present
      [{ password: "password123" }, 400, "Email is required", "email is missing"],
      // Partition: password missing, email present
      [{ email: "test@test.com" }, 400, "Password is required", "password is missing"],
    ])("expected to return error when %s", async (body, status, message, _desc) => {
      await expectLoginError(body, status, message);
    });
  });

  describe("Input Validation - Boundary Values (empty strings)", () => {
    //Tay Kai Jun, A0283343E
    test.each([
      // Boundary: email at empty string (length = 0)
      [{ email: "", password: "password123" }, 400, "Email is required", "email is empty string"],
      // Boundary: password at empty string (length = 0)
      [{ email: "test@test.com", password: "" }, 400, "Password is required", "password is empty string"],
    ])("expected to return error when %s", async (body, status, message, _desc) => {
      await expectLoginError(body, status, message);
    });
  });

  describe("Email Format Validation - Equivalence Partitions (invalid formats)", () => {
    //Tay Kai Jun, A0283343E
    test.each([
      // Partition: no @ and no domain
      ["invalidemail",      "no @ or domain"],
      // Partition: dot but no @
      ["invalidemail.com",  "missing @ symbol"],
      // Partition: multiple @ symbols
      ["test@@example.com", "multiple @ symbols"],
      // Partition: @ present but no domain
      ["test@",             "missing domain"],
    ])("expected to return error when email is '%s' (%s)", async (email) => {
      await expectLoginError({ email, password: "password123" }, 400, "Email must be a valid format");
    });
  });

  describe("Password Length Validation - Boundary Values", () => {
    //Tay Kai Jun, A0283343E
    test.each([
      // Boundary: length = 1 (well below minimum)
      ["1",     "1 character - far below boundary"],
      // Boundary: length = 5 (just below minimum of 6)
      ["Pass1", "5 characters - just below boundary"],
      ["12345", "5 characters - numeric"],
    ])("expected to return error when password is '%s' (%s)", async (password) => {
      await expectLoginError({ email: "test@test.com", password }, 400, "Password must be at least 6 characters long");
    });
  });

  describe("User Not Found", () => {
    //Tay Kai Jun, A0283343E
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
        message: "Invalid email or password",
      });
      expect(comparePassword).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
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
        message: "Invalid email or password",
      });
    });
  });

  describe("Invalid Email or Password", () => {
    //Tay Kai Jun, A0283343E
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
        message: "Invalid email or password",
      });
      expect(JWT.sign).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
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
        message: "Invalid email or password",
      });
    });

    //Tay Kai Jun, A0283343E
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
        message: "Invalid email or password",
      });
      expect(JWT.sign).not.toHaveBeenCalled();
    });
  });

  describe("Successful Login", () => {
    //Tay Kai Jun, A0283343E
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
          message: "Logged in successfully",
          user: expect.objectContaining({
            _id: "userId123",
            name: "John Doe",
            email: "john@test.com",
          }),
          token: "mock_jwt_token_12345",
        })
      );
    });

    //Tay Kai Jun, A0283343E
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
          message: "Logged in successfully",
          user: expect.objectContaining({
            _id: "userId999",
            name: "Alice Smith",
            email: "alicetest@example.com",
          }),
          token: "alice_test_token_xyz",
        })
      );
    });

    //Tay Kai Jun, A0283343E
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
          message: "Logged in successfully",
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

    //Tay Kai Jun, A0283343E
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
    //Tay Kai Jun, A0283343E
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

    //Tay Kai Jun, A0283343E
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

/**
 * Test forgotPasswordController
 * Testing Type: Communication-based + Input validation

 */
describe("Auth Controller - Forgot Password", () => {

  /**
   * Create fake forgot password request with default values
   */
  const createFakeForgotPasswordRequest = (overrides = {}) =>
    createFakeRequest({
      body: {
        email: "test@example.com",
        answer: "football",
        newPassword: "newpass123",
        ...overrides,
      },
    });

  /**
   * Helper to assert forgot password validation errors
   */
  const expectForgotPasswordError = async (body, expectedStatus, expectedMessage) => {
    const fakeReq = createFakeRequest({ body });
    const fakeRes = createFakeResponse();
    await forgotPasswordController(fakeReq, fakeRes);
    expect(fakeRes.status).toHaveBeenCalledWith(expectedStatus);
    expect(fakeRes.send).toHaveBeenCalledWith({
      message: expectedMessage,
    });
  };

  describe("Required Fields Validation - Equivalence Partitions", () => {
    //Tay Kai Jun, A0283343E
    test("should return error when email is missing", async () => {
      await expectForgotPasswordError(
        { answer: "football", newPassword: "newpass123" },
        400,
        "Email is required"
      );
    });

    //Tay Kai Jun, A0283343E
    test("should return error when answer is missing", async () => {
      await expectForgotPasswordError(
        { email: "test@example.com", newPassword: "newpass123" },
        400,
        "Answer is required"
      );
    });

    //Tay Kai Jun, A0283343E
    test("should return error when newPassword is missing", async () => {
      await expectForgotPasswordError(
        { email: "test@example.com", answer: "football" },
        400,
        "New password is required"
      );
    });

    //Tay Kai Jun, A0283343E
    test("should return error when all fields are missing", async () => {
      await expectForgotPasswordError({}, 400, "Email is required");
    });
  });

  describe("User Not Found - Boundary Values", () => {
    //Tay Kai Jun, A0283343E
    test("should return error when user with email and answer not found", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      const fakeReq = createFakeForgotPasswordRequest();
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
        answer: "football",
      });
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer",
      });
      expect(hashPassword).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
    test("should return error when answer is incorrect", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      const fakeReq = createFakeForgotPasswordRequest({ answer: "wrong answer" });
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer",
      });
    });
  });

  describe("Successful Password Reset CF", () => {
    //Tay Kai Jun, A0283343E
    test("should reset password successfully", async () => {
      // Arrange
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        answer: "football",
        name: "Test User",
      };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("hashed_new_password");
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...mockUser,
        password: "hashed_new_password",
      });
      const fakeReq = createFakeForgotPasswordRequest();
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
        answer: "football",
      });
      expect(hashPassword).toHaveBeenCalledWith("newpass123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("user123", {
        password: "hashed_new_password",
      });
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Password reset successfully",
      });
    });

    //Tay Kai Jun, A0283343E
    test("should hash new password before updating", async () => {
      // Arrange
      const mockUser = { _id: "user456", email: "test@example.com", answer: "football" };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("super_secure_hash");
      const fakeReq = createFakeForgotPasswordRequest({ newPassword: "mynewpassword" });
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(hashPassword).toHaveBeenCalledWith("mynewpassword");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("user456", {
        password: "super_secure_hash",
      });
    });
  });

  describe("Database Error Handling", () => {
    //Tay Kai Jun, A0283343E
    test("should handle database error during user lookup", async () => {
      // Arrange
      userModel.findOne.mockRejectedValue(new Error("Database connection failed"));
      const fakeReq = createFakeForgotPasswordRequest();
      const fakeRes = createFakeResponse();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Something went wrong",
        })
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    //Tay Kai Jun, A0283343E
    test("should handle error during password hashing", async () => {
      // Arrange
      const mockUser = { _id: "user789", email: "test@example.com", answer: "football" };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockRejectedValue(new Error("Hashing failed"));
      const fakeReq = createFakeForgotPasswordRequest();
      const fakeRes = createFakeResponse();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Something went wrong",
        })
      );
      consoleSpy.mockRestore();
    });

    //Tay Kai Jun, A0283343E
    test("should handle error during password update", async () => {
      // Arrange
      const mockUser = { _id: "user101", email: "test@example.com", answer: "football" };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("hashed_password");
      userModel.findByIdAndUpdate.mockRejectedValue(new Error("Update failed"));
      const fakeReq = createFakeForgotPasswordRequest();
      const fakeRes = createFakeResponse();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Something went wrong",
        })
      );
      consoleSpy.mockRestore();
    });
  });
});

/**
 * Test testController
 * Testing Type: Simple protected route verification
 */
describe("Auth Controller - Test Protected Route", () => {

  describe("Successful Response", () => {
    //Tay Kai Jun, A0283343E
    test("should return 'Protected Routes' message", () => {
      // Arrange
      const fakeReq = createFakeRequest();
      const fakeRes = createFakeResponse();

      // Act
      testController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.send).toHaveBeenCalledWith("Protected Routes");
    });
  });

  describe("Error Handling", () => {
    //Tay Kai Jun, A0283343E
    test("should handle error when send throws", () => {
      // Arrange
      const fakeReq = createFakeRequest();
      const fakeRes = {
        send: jest.fn()
          .mockImplementationOnce(() => {
            throw new Error("Send failed");
          })
          .mockImplementationOnce(() => {}),
      };
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      testController(fakeReq, fakeRes);

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      expect(fakeRes.send).toHaveBeenCalledTimes(2);
      expect(fakeRes.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) })
      );
      consoleSpy.mockRestore();
    });
  });
});

describe('Auth Controller - Order', () => { // Leong Soon Mun Stephane, A0273409B
  let consoleLogSpy;
  let req, res;

  describe('updateProfileController', () => { // Leong Soon Mun Stephane, A0273409B
    let existingUser;

    beforeEach(() => {
      req = {
        user: {},
        body: {},
      }
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      }
      existingUser = {
        name: "old tester",
        email: "oldtest@gmail.com",
        password: "oldpassword",
        address: "old address",
        phone: "12345678",
      }
      consoleLogSpy = jest.spyOn(console, 'log');
      jest.clearAllMocks();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should respond with 200 if update with password is successful', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      req.user._id = 1
      req.body = {
        name: "new tester",
        email: "newtest@gmail.com",
        password: "newpassword",
        address: "new address",
        phone: "87654321",
      }
      let updatedUser = { flag: "new user" }
      userModel.findById.mockResolvedValueOnce(existingUser);
      hashPassword.mockResolvedValueOnce("hashnewpassword");
      userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);


      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith(1);
      expect(hashPassword).toHaveBeenCalledWith("newpassword");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        1,
        {
          name: "new tester",
          password: "hashnewpassword",
          address: "new address",
          phone: "87654321",
        }, {
        new: true
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: updatedUser,
      });
    });

    it('should respond with 200 if there are no updates', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      req.user._id = 1
      let updatedUser = { flag: "old user" }
      userModel.findById.mockResolvedValueOnce(existingUser);
      userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);


      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith(1);
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        1,
        {
          name: "old tester",
          password: "oldpassword",
          address: "old address",
          phone: "12345678",
        }, {
        new: true
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: updatedUser,
      });
    });

    it('should return response json with error if password is 5 characters', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      req.user._id = 1
      req.body = {
        name: "new tester",
        email: "newtest@gmail.com",
        password: "12345",
        address: "new address",
        phone: "87654321",
      }
      userModel.findById.mockResolvedValueOnce(existingUser);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith(1);
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        error: "Password is required and 6 character long",
      });
    });

    it('should return response with 200 if password is 6 characters', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      req.user._id = 1
      req.body = {
        name: "new tester",
        email: "newtest@gmail.com",
        password: "123456",
        address: "new address",
        phone: "87654321",
      }
      let updatedUser = { flag: "new user" }
      userModel.findById.mockResolvedValueOnce(existingUser);
      hashPassword.mockResolvedValueOnce("hashnewpassword");
      userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);


      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: updatedUser,
      });
    });

    it('should return response with 200 if password is 7 characters', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      req.user._id = 1
      req.body = {
        name: "new tester",
        email: "newtest@gmail.com",
        password: "1234567",
        address: "new address",
        phone: "87654321",
      }
      let updatedUser = { flag: "new user" }
      userModel.findById.mockResolvedValueOnce(existingUser);
      hashPassword.mockResolvedValueOnce("hashnewpassword");
      userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);


      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: updatedUser,
      });
    });

    it('should respond with 400 and message if error occurs', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      req.user._id = 1
      req.body = {
        name: "new tester",
        email: "newtest@gmail.com",
        password: "short",
        address: "new address",
        phone: "87654321",
      }
      let mockError = new Error('findById updateProfileController error');
      userModel.findById.mockRejectedValueOnce(mockError);
      consoleLogSpy.mockImplementation(() => { });

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating profile",
        error: mockError,
      });
    });

  });

  describe('getOrdersController', () => { // Leong Soon Mun Stephane, A0273409B
    beforeEach(() => {
      req = {
        user: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };
      consoleLogSpy = jest.spyOn(console, 'log');
      jest.clearAllMocks();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should respond with orders in json if successful', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      req.user._id = 1;
      let orderObject = {
        populate: jest.fn().mockReturnThis(),
      };
      orderModel.find.mockReturnValue(orderObject);

      // Act
      await getOrdersController(req, res);

      // Assert
      expect(orderModel.find).toHaveBeenCalledWith({ buyer: 1 });
      expect(orderObject.populate).toHaveBeenCalledWith('products', '-photo');
      expect(orderObject.populate).toHaveBeenCalledWith('buyer', 'name');
      expect(res.json).toHaveBeenCalled();
    });

    it('should respond with 500 and message if error occurs', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      req.user._id = 1;
      let mockError = new Error('find orders error');
      let rejectedValue = jest.fn().mockRejectedValueOnce(mockError)
      let orderObject = {
        populate: jest.fn().mockReturnValueOnce({ populate: rejectedValue }),
      };
      orderModel.find.mockReturnValueOnce(orderObject);
      consoleLogSpy.mockImplementation(() => { })

      // Act
      await getOrdersController(req, res);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error While Getting Orders",
        error: mockError,
      });
    });

  });

  describe('getAllOrdersController', () => { // Leong Soon Mun Stephane, A0273409B
    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };
      consoleLogSpy = jest.spyOn(console, 'log');
      jest.clearAllMocks();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should respond with orders in json if successful', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      let orderObject = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValueOnce([]),
      };
      orderModel.find.mockReturnValue(orderObject);

      // Act
      await getAllOrdersController(req, res);

      // Assert
      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(orderObject.populate).toHaveBeenCalledWith('products', '-photo');
      expect(orderObject.populate).toHaveBeenCalledWith('buyer', 'name');
      expect(orderObject.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.json).toHaveBeenCalled();
    });

    it('should respond with 500 and message if error occurs', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      let mockError = new Error('find orders error');
      let orderObject = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValueOnce(mockError),
      };
      orderModel.find.mockReturnValue(orderObject);
      consoleLogSpy.mockImplementation(() => { })

      // Act
      await getAllOrdersController(req, res)

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error While Getting Orders",
        error: mockError,
      });
    });
  });

  describe('orderStatusController', () => { // Leong Soon Mun Stephane, A0273409B

    beforeEach(() => {
      req = {
        body: {},
        params: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };
      consoleLogSpy = jest.spyOn(console, 'log');
      jest.clearAllMocks();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should respond with orders in json if successful', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      req.params.orderId = 1;
      req.body.status = 200;
      orderModel.findByIdAndUpdate.mockResolvedValueOnce(null);

      // Act
      await orderStatusController(req, res)

      // Assert
      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(1, { status: 200 }, { new: true },);
      expect(res.json).toHaveBeenCalled();
    });

    it('should respond with 500 and message if error occurs', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      req.params.orderId = 1;
      req.body.status = 200;
      let mockError = new Error('findByIdAndUpdate error')
      orderModel.findByIdAndUpdate.mockRejectedValueOnce(mockError);
      consoleLogSpy.mockImplementation(() => { })

      // Act
      await orderStatusController(req, res)

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error While Updating Order",
        error: mockError,
      });
    })
  });
});

describe('Admin View Users', () => { // Leong Soon Mun Stephane, A0273409B
  let consoleLogSpy;
  let req, res;

  describe("getAllUsersController", () => {  // Leong Soon Mun Stephane, A0273409B

    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };
      consoleLogSpy = jest.spyOn(console, 'log');
      jest.clearAllMocks();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should respond with users if successful', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      let users = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValueOnce(['user1', 'user2']),
      };
      userModel.find.mockReturnValue(users);

      // Act
      await getAllUsersController(req, res);

      // Assert
      expect(userModel.find).toHaveBeenCalledWith({});
      expect(users.select).toHaveBeenCalledWith('name email phone address role');
      expect(users.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "All users fetched successfully",
        users: ['user1', 'user2'],
      });
    });

    it('should respond with 500 and message if error occurs', async () => { // Leong Soon Mun Stephane, A0273409B
      // Arrange
      let mockError = new Error('find user error');
      let users = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValueOnce(mockError),
      };
      userModel.find.mockReturnValue(users);
      consoleLogSpy.mockImplementation(() => { })

      // Act
      await getAllUsersController(req, res)

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error While Getting Users",
        error: mockError,
      });
    });

  });
});