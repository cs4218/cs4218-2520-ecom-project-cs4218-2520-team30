import express from "express";
import mongoose from "mongoose";
import JWT from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import categoryRoutes from "../routes/categoryRoutes.js";
import categoryModel from "../models/categoryModel.js";
import userModel from "../models/userModel.js";

const buildTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/category", categoryRoutes);
  return app;
};

const createAdminToken = async () => {
  const adminUser = await userModel.create({
    name: "Admin User",
    email: "admin@example.com",
    password: "hashed-password",
    phone: "12345678",
    address: { line1: "Admin Street" },
    answer: "blue",
    role: 1,
  });

  return JWT.sign({ _id: adminUser._id.toString() }, process.env.JWT_SECRET);
};

const createNonAdminToken = async () => {
  const regularUser = await userModel.create({
    name: "Regular User",
    email: "user@example.com",
    password: "hashed-password",
    phone: "87654321",
    address: { line1: "User Street" },
    answer: "green",
    role: 0,
  });

  return JWT.sign({ _id: regularUser._id.toString() }, process.env.JWT_SECRET);
};

// Alek Kwek, A0273471A
describe("Admin category integration tests", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    process.env.JWT_SECRET = "category-integration-secret";
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = buildTestApp();
  });

  afterEach(async () => {
    await Promise.all([
      categoryModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Alek Kwek, A0273471A
  test("creates a category through the protected admin route and persists it", async () => {
    const token = await createAdminToken();

    const response = await request(app)
      .post("/api/v1/category/create-category")
      .set("authorization", token)
      .send({ name: "Electronics" });

    const savedCategory = await categoryModel.findOne({ name: "Electronics" }).lean();

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        message: "New Category Created",
      })
    );
    expect(savedCategory).toEqual(
      expect.objectContaining({
        name: "Electronics",
        slug: "electronics",
      })
    );
  });

  // Alek Kwek, A0273471A
  test("updates a category through the protected admin route and persists the new values", async () => {
    const token = await createAdminToken();
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const response = await request(app)
      .put(`/api/v1/category/update-category/${category._id}`)
      .set("authorization", token)
      .send({ name: "Home Appliances" });

    const updatedCategory = await categoryModel.findById(category._id).lean();

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        message: "Category Updated Successfully",
      })
    );
    expect(updatedCategory).toEqual(
      expect.objectContaining({
        name: "Home Appliances",
        slug: "home-appliances",
      })
    );
  });

  // Alek Kwek, A0273471A
  test("deletes a category through the protected admin route and removes it from the database", async () => {
    const token = await createAdminToken();
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const response = await request(app)
      .delete(`/api/v1/category/delete-category/${category._id}`)
      .set("authorization", token);

    const deletedCategory = await categoryModel.findById(category._id).lean();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Category Deleted Successfully",
    });
    expect(deletedCategory).toBeNull();
  });

  // Alek Kwek, A0273471A
  test("rejects category creation for a non-admin user and does not persist data", async () => {
    const token = await createNonAdminToken();

    const response = await request(app)
      .post("/api/v1/category/create-category")
      .set("authorization", token)
      .send({ name: "Books" });

    const savedCategory = await categoryModel.findOne({ name: "Books" }).lean();

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Forbidden - Admin access required",
    });
    expect(savedCategory).toBeNull();
  });

  // Alek Kwek, A0273471A
  test("rejects category updates for a non-admin user and leaves the existing record unchanged", async () => {
    const token = await createNonAdminToken();
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const response = await request(app)
      .put(`/api/v1/category/update-category/${category._id}`)
      .set("authorization", token)
      .send({ name: "Home Appliances" });

    const unchangedCategory = await categoryModel.findById(category._id).lean();

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Forbidden - Admin access required",
    });
    expect(unchangedCategory).toEqual(
      expect.objectContaining({
        name: "Electronics",
        slug: "electronics",
      })
    );
  });

  // Alek Kwek, A0273471A
  test("rejects category deletion for a non-admin user and keeps the record in the database", async () => {
    const token = await createNonAdminToken();
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const response = await request(app)
      .delete(`/api/v1/category/delete-category/${category._id}`)
      .set("authorization", token);

    const retainedCategory = await categoryModel.findById(category._id).lean();

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Forbidden - Admin access required",
    });
    expect(retainedCategory).toEqual(
      expect.objectContaining({
        name: "Electronics",
        slug: "electronics",
      })
    );
  });
});
