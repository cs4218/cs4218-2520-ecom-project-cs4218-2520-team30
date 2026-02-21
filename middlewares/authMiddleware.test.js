import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { requireSignIn, isAdmin } from "./authMiddleware.js";

jest.mock("jsonwebtoken");
jest.mock("../models/userModel.js");

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = "test-secret-key";
});

/**
 * Helper functions to create fake request/response objects
 */
const createFakeRequest = ({ headers = {}, user = null } = {}) => ({
  headers,
  user,
});

const createFakeResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const createFakeNext = () => jest.fn();

/**
 * Test requireSignIn middleware
 */
describe("Auth Middleware - requireSignIn", () => {
  
  describe("Successful Authentication - Equivalence Partitions", () => {
    //Tay Kai Jun, A0283343E
    test("should decode valid JWT token and call next", () => {
      // Arrange
      const mockDecoded = { _id: "user123", email: "test@test.com" };
      JWT.verify.mockReturnValue(mockDecoded);
      const fakeReq = createFakeRequest({ headers: { authorization: "valid-token" } });
      const fakeRes = createFakeResponse();
      const fakeNext = createFakeNext();

      // Act
      requireSignIn(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(JWT.verify).toHaveBeenCalledWith("valid-token", "test-secret-key");
      expect(fakeReq.user).toEqual(mockDecoded);
      expect(fakeNext).toHaveBeenCalled();
      expect(fakeRes.status).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
    test("should handle token with different user data", () => {
      // Arrange
      const mockDecoded = { _id: "admin456", email: "admin@test.com", role: 1 };
      JWT.verify.mockReturnValue(mockDecoded);
      const fakeReq = createFakeRequest({ headers: { authorization: "admin-token" } });
      const fakeRes = createFakeResponse();
      const fakeNext = createFakeNext();

      // Act
      requireSignIn(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(fakeReq.user).toEqual(mockDecoded);
      expect(fakeNext).toHaveBeenCalled();
    });
  });

  describe("Invalid Token - Equivalence Partitions", () => {
    //Tay Kai Jun, A0283343E
    test("should handle expired token error", () => {
      // Arrange
      const error = new Error("jwt expired");
      JWT.verify.mockImplementation(() => { throw error; });
      const fakeReq = createFakeRequest({ headers: { authorization: "expired-token" } });
      const fakeRes = createFakeResponse();
      const fakeNext = createFakeNext();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      requireSignIn(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(JWT.verify).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(error);
      expect(fakeRes.status).toHaveBeenCalledWith(401);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid or expired token",
      });
      expect(fakeNext).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    //Tay Kai Jun, A0283343E
    test("should handle invalid signature error", () => {
      // Arrange
      const error = new Error("invalid signature");
      JWT.verify.mockImplementation(() => { throw error; });
      const fakeReq = createFakeRequest({ headers: { authorization: "invalid-signature-token" } });
      const fakeRes = createFakeResponse();
      const fakeNext = createFakeNext();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      requireSignIn(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(error);
      expect(fakeRes.status).toHaveBeenCalledWith(401);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid or expired token",
      });
      expect(fakeNext).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    //Tay Kai Jun, A0283343E
    test("should handle malformed token error", () => {
      // Arrange
      const error = new Error("jwt malformed");
      JWT.verify.mockImplementation(() => { throw error; });
      const fakeReq = createFakeRequest({ headers: { authorization: "malformed" } });
      const fakeRes = createFakeResponse();
      const fakeNext = createFakeNext();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      requireSignIn(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(error);
      expect(fakeRes.status).toHaveBeenCalledWith(401);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid or expired token",
      });
      consoleSpy.mockRestore();
    });
  });

  describe("Missing Authorization - Boundary Values", () => {
    //Tay Kai Jun, A0283343E
    test("should handle missing authorization header", () => {
      // Arrange
      JWT.verify.mockImplementation(() => { throw new Error("jwt must be provided"); });
      const fakeReq = createFakeRequest({ headers: {} });
      const fakeRes = createFakeResponse();
      const fakeNext = createFakeNext();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      requireSignIn(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      expect(fakeRes.status).toHaveBeenCalledWith(401);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid or expired token",
      });
      expect(fakeNext).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    //Tay Kai Jun, A0283343E
    test("should handle empty authorization header", () => {
      // Arrange
      JWT.verify.mockImplementation(() => { throw new Error("jwt must be provided"); });
      const fakeReq = createFakeRequest({ headers: { authorization: "" } });
      const fakeRes = createFakeResponse();
      const fakeNext = createFakeNext();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      requireSignIn(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      expect(fakeRes.status).toHaveBeenCalledWith(401);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid or expired token",
      });
      consoleSpy.mockRestore();
    });
  });
});

/**
 * Test isAdmin middleware
 */
describe("Auth Middleware - isAdmin", () => {
  // Common mock data
  let mockAdminUser, mockRegularUser, fakeReq, fakeRes, fakeNext;

  beforeEach(() => {
    // Setup common mock users
    mockAdminUser = { _id: "admin123", role: 1, email: "admin@test.com" };
    mockRegularUser = { _id: "user123", role: 0, email: "user@test.com" };
    
    // Setup common fake objects
    fakeReq = createFakeRequest();
    fakeRes = createFakeResponse();
    fakeNext = createFakeNext();
  });

  describe("Admin Access - Successful", () => {
    //Tay Kai Jun, A0283343E
    test("should allow access when user role is 1 (admin)", async () => {
      // Arrange
      fakeReq.user = { _id: mockAdminUser._id };
      userModel.findById.mockResolvedValue(mockAdminUser);

      // Act
      await isAdmin(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith(mockAdminUser._id);
      expect(fakeNext).toHaveBeenCalled();
      expect(fakeRes.status).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
    test("should query database with correct user ID", async () => {
      // Arrange
      const superAdmin = { _id: "superadmin999", role: 1 };
      fakeReq.user = { _id: superAdmin._id };
      userModel.findById.mockResolvedValue(superAdmin);

      // Act
      await isAdmin(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith(superAdmin._id);
      expect(fakeNext).toHaveBeenCalled();
    });
  });

  describe("Unauthorized Access - Boundary Values (role)", () => {
    //Tay Kai Jun, A0283343E
    test("should reject access when user role is 0 (regular user)", async () => {
      // Arrange
      fakeReq.user = { _id: mockRegularUser._id };
      userModel.findById.mockResolvedValue(mockRegularUser);

      // Act
      await isAdmin(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith(mockRegularUser._id);
      expect(fakeRes.status).toHaveBeenCalledWith(403);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Forbidden - Admin access required",
      });
      expect(fakeNext).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
    test("should reject access when user role is 2 (boundary above admin)", async () => {
      // Arrange
      const role2User = { _id: "user456", role: 2 };
      fakeReq.user = { _id: role2User._id };
      userModel.findById.mockResolvedValue(role2User);

      // Act
      await isAdmin(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(403);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Forbidden - Admin access required",
      });
      expect(fakeNext).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
    test("should reject access when user role is -1 (boundary below regular)", async () => {
      // Arrange
      const invalidRoleUser = { _id: "user789", role: -1 };
      fakeReq.user = { _id: invalidRoleUser._id };
      userModel.findById.mockResolvedValue(invalidRoleUser);

      // Act
      await isAdmin(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(403);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Forbidden - Admin access required",
      });
      expect(fakeNext).not.toHaveBeenCalled();
    });
  });

  describe("Database Error Handling", () => {
    //Tay Kai Jun, A0283343E
    test("should handle database connection error", async () => {
      // Arrange
      fakeReq.user = { _id: mockRegularUser._id };
      const dbError = new Error("Database connection failed");
      userModel.findById.mockRejectedValue(dbError);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await isAdmin(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        error: dbError,
        message: "Error in admin middleware",
      });
      expect(fakeNext).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    //Tay Kai Jun, A0283343E
    test("should handle user not found error", async () => {
      // Arrange
      fakeReq.user = { _id: "nonexistent" };
      userModel.findById.mockResolvedValue(null);

      // Act
      await isAdmin(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("nonexistent");
      expect(fakeRes.status).toHaveBeenCalledWith(403);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Forbidden - Admin access required",
      });
      expect(fakeNext).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
    // BUG TEST: Verifies 500 for network errors (was incorrectly 401)
    test("should handle network timeout error", async () => {
      // Arrange
      fakeReq.user = { _id: mockRegularUser._id };
      const timeoutError = new Error("Network timeout");
      userModel.findById.mockRejectedValue(timeoutError);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      await isAdmin(fakeReq, fakeRes, fakeNext);

      // Assert
      expect(fakeRes.status).toHaveBeenCalledWith(500);
      expect(fakeRes.send).toHaveBeenCalledWith({
        success: false,
        error: timeoutError,
        message: "Error in admin middleware",
      });
      consoleSpy.mockRestore();
    });
  });

  describe("Edge Cases - Missing User Context", () => {
    //Tay Kai Jun, A0283343E
    test("should handle missing req.user object", async () => {
      // Arrange
      const error = new TypeError("Cannot read property '_id' of undefined");
      const fakeReq = createFakeRequest({ user: undefined });
      const fakeRes = createFakeResponse();
      const fakeNext = createFakeNext();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Act
      try {
        await isAdmin(fakeReq, fakeRes, fakeNext);
      } catch (e) {
        // Expected to throw
      }

      // Assert
      expect(fakeNext).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
