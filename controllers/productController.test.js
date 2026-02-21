jest.mock("braintree", () => {
  const mockGenerate = jest.fn();
  const mockSale = jest.fn();
  const Gateway = jest.fn().mockImplementation(() => ({
    clientToken: { generate: mockGenerate },
    transaction: { sale: mockSale },
  }));
  Gateway._mockGenerate = mockGenerate;
  Gateway._mockSale = mockSale;
  return {
    BraintreeGateway: Gateway,
    Environment: { Sandbox: "Sandbox" },
  };
});

// Stub order model so brainTreePaymentController does not touch the real DB.
jest.mock("../models/orderModel.js", () => {
  const mockSave = jest.fn().mockResolvedValue(undefined);
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(function () {
      return { save: mockSave };
    }),
  };
});

import braintree from "braintree";
import {
  braintreeTokenController,
  brainTreePaymentController,
} from "./productController.js";

const mockGenerate = braintree.BraintreeGateway._mockGenerate;
const mockSale = braintree.BraintreeGateway._mockSale;

describe("Product Controller - Payment", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: { _id: "123" }, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  describe("braintreeTokenController", () => {
    it("should send a client token when gateway generation succeeds", async () => {
      // Lum Yi Ren Johannsen, A0273503L
      // ARRANGE
      const fakeTokenResponse = { clientToken: "fake-token-123" };
      mockGenerate.mockImplementation((opts, callback) => {
        callback(null, fakeTokenResponse);
      });

      // ACT
      await braintreeTokenController(req, res);

      // ASSERT
      expect(mockGenerate).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith(fakeTokenResponse);
    });

    it("should return 500 error when gateway generation fails", async () => {
      // Lum Yi Ren Johannsen, A0273503L
      // ARRANGE
      const fakeError = new Error("API Connection Error");
      mockGenerate.mockImplementation((opts, callback) => {
        callback(fakeError, null);
      });

      // ACT
      await braintreeTokenController(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(fakeError);
    });
  });

  describe("brainTreePaymentController", () => {
    it("should process payment successfully and return result", async () => {
      // Lum Yi Ren Johannsen, A0273503L
      // ARRANGE
      req.body = {
        nonce: "fake-nonce",
        cart: [{ price: 10 }, { price: 20 }],
      };
      const fakeTransactionResult = { success: true, transaction: { id: "tx-123" } };
      mockSale.mockImplementation((opts, callback) => {
        callback(null, fakeTransactionResult);
      });

      // ACT
      await brainTreePaymentController(req, res);

      // ASSERT
      expect(mockSale).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("should return 500 error when transaction fails", async () => {
      // Lum Yi Ren Johannsen, A0273503L
      // ARRANGE
      req.body = { nonce: "invalid-nonce", cart: [] };
      const fakeError = new Error("Payment Declined");
      mockSale.mockImplementation((opts, callback) => {
        callback(fakeError, null);
      });

      // ACT
      await brainTreePaymentController(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(fakeError);
    });
  });
});
