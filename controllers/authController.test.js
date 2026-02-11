import { jest, describe, beforeEach, beforeAll, it, expect } from "@jest/globals";

jest.mock("../helpers/authHelper.js");

jest.mock("jsonwebtoken");

import userModel from "../models/userModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";
import {
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

const createFakeResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Auth Controller - Test Protected Route", () => {
  
  describe("Successful Protected Route Access", () => {
    //Tay Kai Jun, A0283343E
    test("expected to return 'Protected Routes' message", () => {
      const fakeReq = createFakeRequest({});
      const fakeRes = createFakeResponse();

      testController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledTimes(1);
      expect(fakeRes.send).toHaveBeenCalledWith("Protected Routes");
    });

    //Tay Kai Jun, A0283343E
    test("expected to send response even with authenticated user in request", () => {
      const fakeReq = createFakeRequest({ user: { _id: "userId123" } });
      const fakeRes = createFakeResponse();

      testController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledTimes(1);
      expect(fakeRes.send).toHaveBeenCalledWith("Protected Routes");
    });
  });

  describe("Error Handling", () => {
    //Tay Kai Jun, A0283343E
    test("expected to log error when both send calls fail", () => {
      const fakeReq = createFakeRequest({});
      const fakeRes = createFakeResponse();
      const sendError = new Error("Response stream closed");
      
      fakeRes.send.mockImplementation(() => {
        throw sendError;
      });
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      expect(() => {
        testController(fakeReq, fakeRes);
      }).toThrow(sendError);
      
      expect(consoleSpy).toHaveBeenCalledWith(sendError);
      expect(fakeRes.send).toHaveBeenCalledTimes(2);
      expect(fakeRes.send).toHaveBeenNthCalledWith(1, "Protected Routes");
      expect(fakeRes.send).toHaveBeenNthCalledWith(2, { error: sendError });

      consoleSpy.mockRestore();
    });
  });

  describe("Middleware Integration Test", () => {
    //Tay Kai Jun, A0283343E
    test("should work when middleware populates", () => {
      const fakeReq = createFakeRequest({
        user: { _id: "user123", email: "test@example.com", role: 1 }
      });
      const fakeRes = createFakeResponse();

      testController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith("Protected Routes");
      expect(fakeRes.send).toHaveBeenCalledTimes(1);
    });

    //Tay Kai Jun, A0283343E
    test("should still respond even without req.user", () => {
      const fakeReq = createFakeRequest({});
      const fakeRes = createFakeResponse();

      testController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith("Protected Routes");
    });
  });

  describe("Protected Route Purpose", () => {
    //Tay Kai Jun, A0283343E
    test("should verify this is truly a protected endpoint", () => {
      const fakeReq = createFakeRequest({
        user: { _id: "user123", name: "Test User", role: 1 }
      });
      const fakeRes = createFakeResponse();

      testController(fakeReq, fakeRes);

      expect(fakeRes.send).toHaveBeenCalledWith("Protected Routes");
    });
  });
});
