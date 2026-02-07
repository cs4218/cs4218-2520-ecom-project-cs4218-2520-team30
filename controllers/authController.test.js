import { jest, describe, beforeEach, beforeAll, it, expect } from "@jest/globals";

jest.mock("../helpers/authHelper.js");

jest.mock("jsonwebtoken");

import userModel from "../models/userModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";
import {
  forgotPasswordController
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

const createFakeResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Auth Controller - Forgot Password", () => {
  
  describe("Successful Password Reset", () => {
    test("should reset password when all inputs are valid", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "test@test.com", answer: "my answer", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();
      const mockUser = { _id: "user123", email: "test@test.com", answer: "my answer" };
      userModel.findOne.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("hashed_newpass123");

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@test.com", answer: "my answer" });
      expect(hashPassword).toHaveBeenCalledWith("newpass123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("user123", { password: "hashed_newpass123" });
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Password reset successfully"
      });
    });

    test("should accept valid email with subdomain", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "user@mail.example.com", answer: "my answer", newPassword: "validpass123" }
      });
      const fakeRes = createFakeResponse();
      const mockUser = { _id: "user456", email: "user@mail.example.com", answer: "my answer" };
      userModel.findOne.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("hashed_validpass123");

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "user@mail.example.com", answer: "my answer" });
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Password reset successfully"
      });
    });
  });

  describe("Validation Errors", () => {
    test("should return 400 when email is missing", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { answer: "my answer", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Email is required" });
    });

    test("should return 400 when email format is invalid", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "invalidemail", answer: "my answer", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Invalid email format" });
    });

    test("should return 400 when email is missing @ symbol", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "testexample.com", answer: "my answer", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Invalid email format" });
    });

    test("should return 400 when answer is missing", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "test@test.com", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Answer is required" });
    });

    test("should return 400 when new password is missing", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "test@test.com", answer: "my answer" }
      });
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "New password is required" });
    });

    test("should return 400 when password is less than 6 characters", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "test@test.com", answer: "my answer", newPassword: "12345" }
      });
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Password must be at least 6 characters long" });
    });

    test("should accept password with exactly 6 characters", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "test@test.com", answer: "my answer", newPassword: "123456" }
      });
      const fakeRes = createFakeResponse();
      const mockUser = { _id: "user123", email: "test@test.com", answer: "my answer" };
      userModel.findOne.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("hashed_123456");

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(hashPassword).toHaveBeenCalledWith("123456");
      expect(fakeRes.status).toHaveBeenCalledWith(200);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Password reset successfully"
      });
    });

    test("should continue execution when email is empty string", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "", answer: "my answer", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(400);
      expect(fakeRes.send).toHaveBeenCalledWith({ message: "Email is required" });
    });
  });

  describe("User Not Found", () => {
    test("should return 404 when user with email and answer not found", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "wrong@test.com", answer: "wrong answer", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();
      userModel.findOne.mockResolvedValue(null);

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "wrong@test.com", answer: "wrong answer" });
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer"
      });
    });

    test("should return 404 when email matches but answer is wrong", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "test@test.com", answer: "wrong answer", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();
      userModel.findOne.mockResolvedValue(null);

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@test.com", answer: "wrong answer" });
      expect(fakeRes.status).toHaveBeenCalledWith(404);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong email or answer"
      });
    });
  });

  describe("Error Handling", () => {
    test("should return 500 when database findOne fails", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "test@test.com", answer: "my answer", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();
      const dbError = new Error("Database connection failed");
      userModel.findOne.mockRejectedValue(dbError);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error: dbError
      });

      consoleSpy.mockRestore();
    });

    test("should return 500 when password hashing fails", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "test@test.com", answer: "my answer", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();
      const mockUser = { _id: "user123", email: "test@test.com", answer: "my answer" };
      const hashError = new Error("Hashing failed");
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockRejectedValue(hashError);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(hashError);
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error: hashError
      });

      consoleSpy.mockRestore();
    });

    test("should return 500 when database update fails", async () => {
      // Arrange
      const fakeReq = createFakeRequest({
        body: { email: "test@test.com", answer: "my answer", newPassword: "newpass123" }
      });
      const fakeRes = createFakeResponse();
      const mockUser = { _id: "user123", email: "test@test.com", answer: "my answer" };
      const updateError = new Error("Update failed");
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("hashed_newpass123");
      userModel.findByIdAndUpdate.mockRejectedValue(updateError);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await forgotPasswordController(fakeReq, fakeRes);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(updateError);
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error: updateError
      });

      consoleSpy.mockRestore();
    });
  });
});
