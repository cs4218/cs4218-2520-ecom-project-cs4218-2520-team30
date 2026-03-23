/**
 * Integration Tests: brainTreePaymentController × orderModel × MongoDB (in-memory)
 * Bottom-up DB integration: real Mongoose + mongodb-memory-server; Braintree gateway.transaction.sale stubbed.
 */

import { jest, describe, beforeAll, afterAll, afterEach, it, expect } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import braintree from "braintree";
import orderModel from "../../../models/orderModel.js";
import { brainTreePaymentController } from "../../../controllers/productController.js";

jest.mock("braintree", () => {
  const mockSaleFn = jest.fn();
  const Gateway = jest.fn().mockImplementation(() => ({
    transaction: { sale: mockSaleFn },
  }));
  Gateway._mockSale = mockSaleFn;
  return {
    __esModule: true,
    default: {
      BraintreeGateway: Gateway,
      Environment: { Sandbox: "sandbox" },
    },
  };
});

const mockSale = braintree.BraintreeGateway._mockSale;

let mongoServer;

process.env.BRAINTREE_MERCHANT_ID = "test-merchant";
process.env.BRAINTREE_PUBLIC_KEY = "test-public";
process.env.BRAINTREE_PRIVATE_KEY = "test-private";

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await orderModel.deleteMany({});
  jest.clearAllMocks();
});

const createFakeResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

/** Wait for async order.save() (controller does not await) */
const flushAsyncWork = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
};

const waitForOrderByBuyer = async (buyerId, { timeoutMs = 5000 } = {}) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const doc = await orderModel.findOne({ buyer: buyerId });
    if (doc) return doc;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return null;
};

// Test Generation Technique: Equivalence Partitioning (Valid/Error)
describe("brainTreePaymentController (integration)", () => {
  it("persists order and returns success when Braintree sale succeeds", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const buyerId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const req = {
      body: {
        nonce: "fake-valid-nonce",
        cart: [{ _id: productId, price: 25, name: "Test Product" }],
      },
      user: { _id: buyerId },
    };
    const res = createFakeResponse();
    mockSale.mockImplementation((opts, callback) => {
      callback(null, { success: true, id: "fake-tx-id" });
    });

    // ACT
    await brainTreePaymentController(req, res);
    await flushAsyncWork();

    // ASSERT
    expect(mockSale).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 25,
        paymentMethodNonce: "fake-valid-nonce",
        options: { submitForSettlement: true },
      }),
      expect.any(Function)
    );
    // 200 OK: controller uses res.json({ ok: true }) (Express default status 200)
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(res.status).not.toHaveBeenCalledWith(500);
    const saved = await waitForOrderByBuyer(buyerId);
    expect(saved).not.toBeNull();
    expect(saved.payment).toMatchObject({ success: true, id: "fake-tx-id" });
    expect(String(saved.buyer)).toBe(String(buyerId));
  });

  it("returns 500 when Braintree sale fails", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const buyerId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const req = {
      body: {
        nonce: "bad-nonce",
        cart: [{ _id: productId, price: 10, name: "X" }],
      },
      user: { _id: buyerId },
    };
    const res = createFakeResponse();
    const gatewayError = new Error("Braintree declined");
    mockSale.mockImplementation((opts, callback) => {
      callback(gatewayError, null);
    });

    // ACT
    await brainTreePaymentController(req, res);
    await flushAsyncWork();

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(gatewayError);
    expect(res.json).not.toHaveBeenCalled();
    const count = await orderModel.countDocuments({});
    expect(count).toBe(0);
  });
});
