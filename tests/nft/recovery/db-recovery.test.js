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
import JWT from "jsonwebtoken";
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
  getProductController,
} from "../../../controllers/productController.js";
import { loginController } from "../../../controllers/authController.js";

let mongoServer;
let mongoUri;

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

/** Wait for the un-awaited order.save() to settle */
const flushAsync = () =>
  new Promise((r) => setTimeout(r, 200));

const ensureConnected = async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
  }
};

const seedData = async () => {
  testCategory = await categoryModel.create({
    name: "Electronics",
    slug: "electronics",
  });

  const hashedPw = await hashPassword("password123");
  testUser = await userModel.create({
    name: "Recovery Tester",
    email: "recovery@test.com",
    password: hashedPw,
    phone: "12345678",
    address: "123 Test St",
    answer: "blue",
    role: 0,
  });

  testProducts = await productModel.create([
    {
      name: "Laptop",
      slug: "laptop",
      description: "A test laptop",
      price: 999,
      category: testCategory._id,
      quantity: 10,
      shipping: true,
    },
    {
      name: "Phone",
      slug: "phone",
      description: "A test phone",
      price: 499,
      category: testCategory._id,
      quantity: 20,
      shipping: true,
    },
  ]);
};

// --- lifecycle ---

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  await seedData();
});

afterAll(async () => {
  await ensureConnected();
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  await ensureConnected();
  jest.clearAllMocks();
});

afterEach(async () => {
  // Clean up orders created during tests
  try {
    await ensureConnected();
    await orderModel.deleteMany({});
  } catch {
    // DB may be disconnected — that's fine, next beforeEach reconnects
  }
});

// ============================================================
// Story 88: DB / Internal Recovery Tests
// ============================================================

describe("Story 88 — DB / Internal Recovery", () => {
  // ----------------------------------------------------------
  // Test 1: DB disconnects during order save after payment
  // ----------------------------------------------------------
  describe("Test 1: DB disconnect during order save after successful payment", () => {
    it("should handle DB failure during order save — server says ok but order is lost", async () => {
      // ms3
      // Lum Yi Ren Johannsen, A0273503L

      const req = {
        body: {
          nonce: "fake-nonce",
          cart: [
            { _id: testProducts[0]._id, price: 999, name: "Laptop" },
          ],
        },
        user: { _id: testUser._id },
      };
      const res = createFakeRes();

      // Simulate DB failure by making orderModel.prototype.save reject.
      // The controller's .save() is NOT awaited, so the rejection becomes
      // an unhandled promise rejection (a real bug). We catch it here to
      // prevent it from crashing the test runner, while proving the bug.
      const dbError = new Error("MongoNotConnectedError: simulated DB crash");
      const savePromises = [];
      jest
        .spyOn(orderModel.prototype, "save")
        .mockImplementation(function () {
          // Return a promise that we control — catch it ourselves to prevent
          // the unhandled rejection from bubbling to Jest
          const p = Promise.reject(dbError);
          p.catch(() => {}); // suppress unhandled rejection
          savePromises.push(p);
          return p;
        });

      // Mock Braintree to succeed — payment goes through
      mockSale.mockImplementation((opts, callback) => {
        callback(null, { success: true, id: "tx-disconnect-test" });
      });

      await brainTreePaymentController(req, res);
      await flushAsync();

      // BUG DEMONSTRATED: .save() is NOT awaited — the controller responds
      // { ok: true } even though the order save failed / DB was down.
      // The user is charged but the order is never recorded.
      expect(res.json).toHaveBeenCalledWith({ ok: true });

      // The save was called but rejected
      expect(orderModel.prototype.save).toHaveBeenCalled();

      // Restore mock
      orderModel.prototype.save.mockRestore();

      // Verify no order was persisted in the database
      const orders = await orderModel.find({});
      expect(orders.length).toBe(0);

      // Verify existing data is still intact
      const user = await userModel.findById(testUser._id);
      expect(user).not.toBeNull();
      expect(user.email).toBe("recovery@test.com");

      const products = await productModel.find({});
      expect(products.length).toBe(2);
    });
  });

  // ----------------------------------------------------------
  // Test 2: DB disconnects during product listing
  // ----------------------------------------------------------
  describe("Test 2: DB disconnect during product listing", () => {
    it("should return an error when DB is down, then recover", async () => {
      // ms3
      // Lum Yi Ren Johannsen, A0273503L

      // Disconnect DB
      await mongoose.disconnect();

      // Attempt to list products while DB is down
      const req = {};
      const res = createFakeRes();
      await getProductController(req, res);

      // Should return 500 error, not crash
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in getting products",
        })
      );

      // Reconnect
      await ensureConnected();

      // Retry — should succeed now
      const res2 = createFakeRes();
      await getProductController({}, res2);

      expect(res2.status).toHaveBeenCalledWith(200);
      expect(res2.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "All Products",
        })
      );
      const body = res2.send.mock.calls[0][0];
      expect(body.products.length).toBe(2);
    });
  });

  // ----------------------------------------------------------
  // Test 3: DB disconnects during user login
  // ----------------------------------------------------------
  describe("Test 3: DB disconnect during login", () => {
    it("should fail gracefully when DB is down, then allow login after recovery", async () => {
      // ms3
      // Lum Yi Ren Johannsen, A0273503L

      // Disconnect DB
      await mongoose.disconnect();

      // Attempt login while DB is down
      const req = {
        body: { email: "recovery@test.com", password: "password123" },
      };
      const res = createFakeRes();
      await loginController(req, res);

      // Should return a 500 error — not crash or hang
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in login",
        })
      );

      // Reconnect
      await ensureConnected();

      // Retry login — should succeed
      const res2 = createFakeRes();
      await loginController(
        { body: { email: "recovery@test.com", password: "password123" } },
        res2
      );

      expect(res2.status).toHaveBeenCalledWith(200);
      const loginBody = res2.send.mock.calls[0][0];
      expect(loginBody.success).toBe(true);
      expect(loginBody.token).toBeDefined();
      expect(loginBody.user.email).toBe("recovery@test.com");

      // Verify token is valid for protected routes
      const decoded = JWT.verify(loginBody.token, process.env.JWT_SECRET);
      expect(String(decoded._id)).toBe(String(testUser._id));
    });
  });

  // ----------------------------------------------------------
  // Test 4: Full data integrity verification after crash
  // ----------------------------------------------------------
  describe("Test 4: Data integrity after DB crash and reconnection", () => {
    it("should preserve all data intact after disconnect/reconnect cycle", async () => {
      // ms3
      // Lum Yi Ren Johannsen, A0273503L

      // Create an order so we have data across all collections
      const order = await orderModel.create({
        products: [testProducts[0]._id, testProducts[1]._id],
        payment: { method: "braintree", id: "integrity-test-tx" },
        buyer: testUser._id,
        status: "Not Process",
      });

      // Record pre-crash state
      const preCrash = {
        userCount: await userModel.countDocuments(),
        productCount: await productModel.countDocuments(),
        categoryCount: await categoryModel.countDocuments(),
        orderCount: await orderModel.countDocuments(),
        userEmail: (await userModel.findById(testUser._id)).email,
        productPrices: (await productModel.find({}).sort({ name: 1 })).map(
          (p) => p.price
        ),
        orderStatus: (await orderModel.findById(order._id)).status,
      };

      // Simulate crash
      await mongoose.disconnect();

      // Reconnect
      await ensureConnected();

      // Verify all data is intact
      const postCrash = {
        userCount: await userModel.countDocuments(),
        productCount: await productModel.countDocuments(),
        categoryCount: await categoryModel.countDocuments(),
        orderCount: await orderModel.countDocuments(),
        userEmail: (await userModel.findById(testUser._id)).email,
        productPrices: (await productModel.find({}).sort({ name: 1 })).map(
          (p) => p.price
        ),
        orderStatus: (await orderModel.findById(order._id)).status,
      };

      // Document counts
      expect(postCrash.userCount).toBe(preCrash.userCount);
      expect(postCrash.productCount).toBe(preCrash.productCount);
      expect(postCrash.categoryCount).toBe(preCrash.categoryCount);
      expect(postCrash.orderCount).toBe(preCrash.orderCount);

      // Key field values are not corrupted
      expect(postCrash.userEmail).toBe(preCrash.userEmail);
      expect(postCrash.productPrices).toEqual(preCrash.productPrices);
      expect(postCrash.orderStatus).toBe(preCrash.orderStatus);

      // References / relationships are intact
      const recoveredOrder = await orderModel
        .findById(order._id)
        .populate("buyer", "name email");
      expect(recoveredOrder.buyer).not.toBeNull();
      expect(recoveredOrder.buyer.email).toBe("recovery@test.com");
      expect(recoveredOrder.products.length).toBe(2);

      // Timestamps preserved
      expect(recoveredOrder.createdAt).toEqual(order.createdAt);
      expect(recoveredOrder.updatedAt).toEqual(order.updatedAt);
    });
  });
});
