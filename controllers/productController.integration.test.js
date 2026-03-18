// Alek Kwek, A0273471A
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import JWT from "jsonwebtoken";
import slugify from "slugify";
import { MongoMemoryServer } from "mongodb-memory-server";
import productRoutes from "../routes/productRoutes.js";
import userModel from "../models/userModel.js";
import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";

jest.mock("braintree", () => {
  const mockGenerate = jest.fn();
  const mockSale = jest.fn();

  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      clientToken: { generate: mockGenerate },
      transaction: { sale: mockSale },
    })),
    Environment: { Sandbox: "Sandbox" },
  };
});

// Alek Kwek, A0273471A
describe("Admin product management integration tests", () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    process.env.JWT_SECRET = "integration-test-secret";
    app = express();
    app.use(express.json());
    app.use("/api/v1/product", productRoutes);
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "jest-integration",
    });
  });

  afterEach(async () => {
    if (mongoose.connection.readyState !== 1) {
      return;
    }

    await Promise.all([
      userModel.deleteMany({}),
      categoryModel.deleteMany({}),
      productModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  const createAdminContext = async () => {
    const admin = await userModel.create({
      name: "Admin Tester",
      email: "admin@example.com",
      password: "hashed-password",
      phone: "91234567",
      address: { line1: "Testing Street" },
      answer: "blue",
      role: 1,
    });

    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const token = JWT.sign(
      { _id: admin._id.toString() },
      process.env.JWT_SECRET
    );

    return { admin, category, token };
  };

  const createNonAdminContext = async () => {
    const user = await userModel.create({
      name: "Regular User",
      email: "user@example.com",
      password: "hashed-password",
      phone: "81234567",
      address: { line1: "User Street" },
      answer: "green",
      role: 0,
    });

    const category = await categoryModel.create({
      name: "Accessories",
      slug: "accessories",
    });

    const token = JWT.sign(
      { _id: user._id.toString() },
      process.env.JWT_SECRET
    );

    return { user, category, token };
  };

  // Alek Kwek, A0273471A
  test("creates an admin product through the protected route and persists it", async () => {
    const { category, token } = await createAdminContext();

    const response = await request(app)
      .post("/api/v1/product/create-product")
      .set("authorization", token)
      .field("name", "Integration Laptop")
      .field("description", "Created through route integration test")
      .field("price", "1999")
      .field("category", category._id.toString())
      .field("quantity", "8")
      .field("shipping", "true")
      .attach("photo", Buffer.from("fake-image-content"), "laptop.jpg");

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Product Created Successfully");

    const savedProduct = await productModel.findOne({ name: "Integration Laptop" });
    expect(savedProduct).not.toBeNull();
    expect(savedProduct.slug).toBe(slugify("Integration Laptop"));
    expect(savedProduct.description).toBe("Created through route integration test");
    expect(savedProduct.price).toBe(1999);
    expect(savedProduct.quantity).toBe(8);
    expect(savedProduct.category.toString()).toBe(category._id.toString());
    expect(savedProduct.photo.contentType).toBe("image/jpeg");
    expect(savedProduct.photo.data.length).toBeGreaterThan(0);
  });

  // Alek Kwek, A0273471A
  test("updates an admin product through the protected route and saves the new values", async () => {
    const { category, token } = await createAdminContext();
    const initialProduct = await productModel.create({
      name: "Old Laptop",
      slug: "old-laptop",
      description: "Old description",
      price: 1200,
      category: category._id,
      quantity: 5,
      shipping: false,
    });

    const response = await request(app)
      .put(`/api/v1/product/update-product/${initialProduct._id}`)
      .set("authorization", token)
      .field("name", "Updated Laptop")
      .field("description", "Updated description")
      .field("price", "1450")
      .field("category", category._id.toString())
      .field("quantity", "11")
      .field("shipping", "true")
      .attach("photo", Buffer.from("updated-image-content"), "updated.jpg");

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Product Updated Successfully");

    const updatedProduct = await productModel.findById(initialProduct._id);
    expect(updatedProduct.name).toBe("Updated Laptop");
    expect(updatedProduct.slug).toBe(slugify("Updated Laptop"));
    expect(updatedProduct.description).toBe("Updated description");
    expect(updatedProduct.price).toBe(1450);
    expect(updatedProduct.quantity).toBe(11);
    expect(updatedProduct.photo.contentType).toBe("image/jpeg");
    expect(updatedProduct.photo.data.length).toBeGreaterThan(0);
  });

  // Alek Kwek, A0273471A
  test("deletes an admin product through the protected route and removes it from persistence", async () => {
    const { category, token } = await createAdminContext();
    const product = await productModel.create({
      name: "Delete Me",
      slug: "delete-me",
      description: "Temporary product",
      price: 100,
      category: category._id,
      quantity: 1,
      shipping: false,
    });

    const response = await request(app)
      .delete(`/api/v1/product/delete-product/${product._id}`)
      .set("authorization", token);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Product Deleted successfully");

    const deletedProduct = await productModel.findById(product._id);
    expect(deletedProduct).toBeNull();
  });

  // Alek Kwek, A0273471A
  test("rejects product deletion when the request has no authentication token", async () => {
    const category = await categoryModel.create({
      name: "Locked",
      slug: "locked",
    });
    const product = await productModel.create({
      name: "Protected Delete",
      slug: "protected-delete",
      description: "Should survive unauthenticated delete",
      price: 60,
      category: category._id,
      quantity: 2,
      shipping: true,
    });

    const response = await request(app).delete(
      `/api/v1/product/delete-product/${product._id}`
    );

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid or expired token");

    const persistedProduct = await productModel.findById(product._id);
    expect(persistedProduct).not.toBeNull();
  });

  // Alek Kwek, A0273471A
  test("rejects product deletion when the authenticated user is not an admin", async () => {
    const { category, token } = await createNonAdminContext();
    const product = await productModel.create({
      name: "Non Admin Delete",
      slug: "non-admin-delete",
      description: "Should survive forbidden delete",
      price: 70,
      category: category._id,
      quantity: 4,
      shipping: false,
    });

    const response = await request(app)
      .delete(`/api/v1/product/delete-product/${product._id}`)
      .set("authorization", token);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Forbidden - Admin access required");

    const persistedProduct = await productModel.findById(product._id);
    expect(persistedProduct).not.toBeNull();
  });

  // Alek Kwek, A0273471A
  test("rejects product creation when the request has no authentication token", async () => {
    const category = await categoryModel.create({
      name: "Security",
      slug: "security",
    });

    const response = await request(app)
      .post("/api/v1/product/create-product")
      .field("name", "Unauthorized Product")
      .field("description", "Should not be created")
      .field("price", "20")
      .field("category", category._id.toString())
      .field("quantity", "2")
      .field("shipping", "false");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid or expired token");

    const savedProduct = await productModel.findOne({ name: "Unauthorized Product" });
    expect(savedProduct).toBeNull();
  });

  // Alek Kwek, A0273471A
  test("rejects product creation when the authenticated user is not an admin", async () => {
    const { category, token } = await createNonAdminContext();

    const response = await request(app)
      .post("/api/v1/product/create-product")
      .set("authorization", token)
      .field("name", "Forbidden Product")
      .field("description", "Should be blocked by admin middleware")
      .field("price", "50")
      .field("category", category._id.toString())
      .field("quantity", "3")
      .field("shipping", "false");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Forbidden - Admin access required");

    const savedProduct = await productModel.findOne({ name: "Forbidden Product" });
    expect(savedProduct).toBeNull();
  });
});
