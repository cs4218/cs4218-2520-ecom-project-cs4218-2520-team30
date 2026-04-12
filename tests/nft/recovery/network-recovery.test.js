// Lum Yi Ren Johannsen, A0273503L
// ms3

import {
  jest,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  it,
  expect,
} from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import braintree from "braintree";

import userModel from "../../../models/userModel.js";
import productModel from "../../../models/productModel.js";
import categoryModel from "../../../models/categoryModel.js";
import orderModel from "../../../models/orderModel.js";
import { hashPassword } from "../../../helpers/authHelper.js";

// Access the hoisted mock functions from setup-braintree-mock.cjs
const mockSale = braintree.BraintreeGateway._mockSale;
const mockGenerate = braintree.BraintreeGateway._mockGenerate;

// Import controllers under test
import {
  brainTreePaymentController,
  braintreeTokenController,
} from "../../../controllers/productController.js";

let mongoServer;

// Seed data references
let testUser;
let testCategory;
let testProducts;

process.env.JWT_SECRET = "test-jwt-secret-recovery";
process.env.BRAINTREE_MERCHANT_ID = "test-merchant";
process.env.BRAINTREE_PUBLIC_KEY = "test-public";
process.env.BRAINTREE_PRIVATE_KEY = "test-private";

// --- helpers ---

const createFakeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

const waitForOrderByBuyer = async (buyerId, { timeoutMs = 5000 } = {}) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const doc = await orderModel.findOne({ buyer: buyerId });
    if (doc) return doc;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
};

const seedData = async () => {
  testCategory = await categoryModel.create({
    name: "Gadgets",
    slug: "gadgets",
  });

  const hashedPw = await hashPassword("password123");
  testUser = await userModel.create({
    name: "Network Tester",
    email: "network@test.com",
    password: hashedPw,
    phone: "87654321",
    address: "456 Net St",
    answer: "red",
    role: 0,
  });

  testProducts = await productModel.create([
    {
      name: "Tablet",
      slug: "tablet",
      description: "A test tablet",
      price: 399,
      category: testCategory._id,
      quantity: 15,
      shipping: true,
    },
    {
      name: "Watch",
      slug: "watch",
      description: "A test watch",
      price: 199,
      category: testCategory._id,
      quantity: 30,
      shipping: false,
    },
  ]);
};

// --- lifecycle ---

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await seedData();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(async () => {
  jest.restoreAllMocks();
  await orderModel.deleteMany({});
});

// ============================================================
// Story 89: External / Network Recovery Tests
// ============================================================

describe("Story 89 — External / Network Recovery", () => {
  // ----------------------------------------------------------
  // Test 5: Braintree timeout during token generation
  // ----------------------------------------------------------
  describe("Test 5: Braintree timeout during token generation", () => {
    it("should return 500 when Braintree token generation fails, then recover", async () => {
      // ms3
      // Lum Yi Ren Johannsen, A0273503L

      // Simulate Braintree gateway failure
      mockGenerate.mockImplementation((opts, callback) => {
        callback(new Error("Gateway timeout — connection refused"), null);
      });

      const req = {};
      const res = createFakeRes();
      await braintreeTokenController(req, res);

      // Should return 500 with the error
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(expect.any(Error));

      // Server should still be functional — verify with a second request
      // after "recovering" the gateway
      mockGenerate.mockImplementation((opts, callback) => {
        callback(null, { clientToken: "recovered-token-abc123" });
      });

      const res2 = createFakeRes();
      await braintreeTokenController({}, res2);

      // Should succeed now
      expect(res2.status).not.toHaveBeenCalledWith(500);
      expect(res2.send).toHaveBeenCalledWith(
        expect.objectContaining({ clientToken: "recovered-token-abc123" })
      );
    });
  });

  // ----------------------------------------------------------
  // Test 6: Braintree timeout during payment processing
  // ----------------------------------------------------------
  describe("Test 6: Braintree timeout during payment processing", () => {
    it("should return 500 and NOT create an order when Braintree fails", async () => {
      // ms3
      // Lum Yi Ren Johannsen, A0273503L

      const gatewayError = new Error("Gateway timeout during payment");
      mockSale.mockImplementation((opts, callback) => {
        callback(gatewayError, null);
      });

      const req = {
        body: {
          nonce: "timeout-nonce",
          cart: [
            { _id: testProducts[0]._id, price: 399, name: "Tablet" },
            { _id: testProducts[1]._id, price: 199, name: "Watch" },
          ],
        },
        user: { _id: testUser._id },
      };
      const res = createFakeRes();

      await brainTreePaymentController(req, res);


      // Should return 500
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(gatewayError);

      // No order should have been created
      const orders = await orderModel.find({});
      expect(orders.length).toBe(0);

      // Existing data should be unaffected
      const user = await userModel.findById(testUser._id);
      expect(user).not.toBeNull();
      expect(user.name).toBe("Network Tester");

      const products = await productModel.find({});
      expect(products.length).toBe(2);
    });
  });

  // ----------------------------------------------------------
  // Test 7: Braintree returns declined/failed transaction
  // ----------------------------------------------------------
  describe("Test 7: Braintree returns declined transaction", () => {
    it("should return 500 and NOT create an order when transaction is declined", async () => {
      // ms3
      // Lum Yi Ren Johannsen, A0273503L

      // Braintree returns null result (declined) — the controller checks `if (result)`
      // and a falsy result falls through to the else branch
      mockSale.mockImplementation((opts, callback) => {
        callback(null, null);
      });

      const req = {
        body: {
          nonce: "declined-nonce",
          cart: [{ _id: testProducts[0]._id, price: 399, name: "Tablet" }],
        },
        user: { _id: testUser._id },
      };
      const res = createFakeRes();

      await brainTreePaymentController(req, res);


      // Controller does `res.status(500).send(error)` where error is null
      expect(res.status).toHaveBeenCalledWith(500);

      // No order should be created for a declined transaction
      const orders = await orderModel.find({});
      expect(orders.length).toBe(0);

      // Verify any previously created orders would still be intact
      // (create one manually to check)
      const existingOrder = await orderModel.create({
        products: [testProducts[0]._id],
        payment: { method: "braintree", id: "previous-tx" },
        buyer: testUser._id,
        status: "Processing",
      });

      const allOrders = await orderModel.find({});
      expect(allOrders.length).toBe(1);
      expect(allOrders[0].status).toBe("Processing");
    });
  });

  // ----------------------------------------------------------
  // Test 8: Braintree recovers after failure — full retry flow
  // ----------------------------------------------------------
  describe("Test 8: Full retry flow — fail then succeed", () => {
    it("should allow successful payment after a prior gateway failure with no duplicates", async () => {
      // ms3
      // Lum Yi Ren Johannsen, A0273503L

      const cart = [
        { _id: testProducts[0]._id, price: 399, name: "Tablet" },
        { _id: testProducts[1]._id, price: 199, name: "Watch" },
      ];

      // ---- FIRST ATTEMPT: Braintree fails ----
      mockSale.mockImplementation((opts, callback) => {
        callback(new Error("Service unavailable"), null);
      });

      const req1 = {
        body: { nonce: "retry-nonce-1", cart },
        user: { _id: testUser._id },
      };
      const res1 = createFakeRes();

      await brainTreePaymentController(req1, res1);


      // Should fail
      expect(res1.status).toHaveBeenCalledWith(500);
      expect(res1.json).not.toHaveBeenCalled();

      // No order created from failed attempt
      let orders = await orderModel.find({});
      expect(orders.length).toBe(0);

      // ---- SECOND ATTEMPT: Braintree recovers ----
      mockSale.mockImplementation((opts, callback) => {
        callback(null, { success: true, id: "retry-tx-success" });
      });

      const req2 = {
        body: { nonce: "retry-nonce-2", cart },
        user: { _id: testUser._id },
      };
      const res2 = createFakeRes();

      await brainTreePaymentController(req2, res2);

      // Wait for the async callback's await .save() to complete
      const savedOrder = await waitForOrderByBuyer(testUser._id);

      // Should succeed — check after order is persisted since the
      // async callback needs time to await .save() then call res.json
      expect(res2.json).toHaveBeenCalledWith({ ok: true });
      expect(savedOrder).not.toBeNull();
      expect(savedOrder.payment).toMatchObject({
        success: true,
        id: "retry-tx-success",
      });
      expect(String(savedOrder.buyer)).toBe(String(testUser._id));

      // Exactly ONE order — no duplicates from the failed first attempt
      orders = await orderModel.find({});
      expect(orders.length).toBe(1);
    });
  });
});
