/**
 * Bottom-up integration tests: categoryController × categoryModel × MongoDB (in-memory)
 */

import { describe, beforeAll, afterAll, afterEach, it, expect, jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import slugify from "slugify";
import categoryModel from "../../../models/categoryModel.js";
import {
  createCategoryController,
  categoryController,
} from "../../../controllers/categoryController.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoServer.getUri());
  }
  await categoryModel.deleteMany({});
});

const createFakeResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

const createFakeRequest = (body = {}) => ({ body });

// Test Generation Technique: Equivalence Partitioning (Valid/Invalid)
describe("createCategoryController — Equivalence Partitioning (Valid/Invalid) and BVA", () => {
  it("should create a category for a valid name (valid partition) and persist to the database", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const categoryName = "Integration Test Category";
    const expectedSlug = slugify(categoryName).toLowerCase();
    const req = createFakeRequest({ name: categoryName });
    const res = createFakeResponse();

    // ACT
    await createCategoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(201);
    const sendPayload = res.send.mock.calls[0][0];
    expect(sendPayload.success).toBe(true);
    expect(sendPayload.message).toBe("New Category Created");
    expect(sendPayload.category.name).toBe(categoryName);
    expect(sendPayload.category.slug).toBe(expectedSlug);

    const inDb = await categoryModel.findOne({ name: categoryName });
    expect(inDb).not.toBeNull();
    expect(inDb.slug).toBe(expectedSlug);
    expect(await categoryModel.countDocuments({})).toBe(1);
  });

  it("should return 400 when name is missing from the body (invalid partition)", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const req = createFakeRequest({});
    const res = createFakeResponse();

    // ACT
    await createCategoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    expect(await categoryModel.countDocuments({})).toBe(0);
  });

  it("should return 400 for an empty category name (invalid partition / BVA boundary)", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const req = createFakeRequest({ name: "" });
    const res = createFakeResponse();

    // ACT
    await createCategoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    expect(await categoryModel.countDocuments({})).toBe(0);
  });

  it("should return 200 with failure when the category name already exists (duplicate / error condition)", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const categoryName = "Duplicate Category";
    await new categoryModel({
      name: categoryName,
      slug: slugify(categoryName).toLowerCase(),
    }).save();

    const req = createFakeRequest({ name: categoryName });
    const res = createFakeResponse();

    // ACT
    await createCategoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Category Already Exists",
    });
    expect(await categoryModel.countDocuments({})).toBe(1);
  });
});

describe("createCategoryController - branch coverage (catch / 500)", () => {
  it("should return 500 when the database connection is unavailable during create", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    await mongoose.connection.close();

    const req = createFakeRequest({ name: "Will Fail To Save" });
    const res = createFakeResponse();

    // ACT
    await createCategoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    const payload = res.send.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("Error in Category");
    expect(payload.error).toBeDefined();

    logSpy.mockRestore();
  });
});

describe("categoryController — list categories and branch coverage", () => {
  it("should return 200 with all seeded categories from the database", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const seedA = { name: "Seed Category Alpha", slug: slugify("Seed Category Alpha").toLowerCase() };
    const seedB = { name: "Seed Category Beta", slug: slugify("Seed Category Beta").toLowerCase() };
    await new categoryModel(seedA).save();
    await new categoryModel(seedB).save();

    const req = createFakeRequest();
    const res = createFakeResponse();

    // ACT
    await categoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(200);
    const sendPayload = res.send.mock.calls[0][0];
    expect(sendPayload.success).toBe(true);
    expect(sendPayload.message).toBe("All Categories List");
    expect(Array.isArray(sendPayload.category)).toBe(true);
    expect(sendPayload.category).toHaveLength(2);

    const names = sendPayload.category.map((c) => c.name).sort();
    expect(names).toEqual([seedA.name, seedB.name].sort());

    const dbDocs = await categoryModel.find({}).lean();
    expect(dbDocs.map((d) => d.name).sort()).toEqual(names);
  });

  it("should return 200 with an empty list when no categories exist (success branch)", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const req = createFakeRequest();
    const res = createFakeResponse();

    // ACT
    await categoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(200);
    const sendPayload = res.send.mock.calls[0][0];
    expect(sendPayload.success).toBe(true);
    expect(sendPayload.category).toEqual([]);
  });

  it("should return 500 when the database connection is unavailable during find", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    await mongoose.connection.close();

    const req = createFakeRequest();
    const res = createFakeResponse();

    // ACT
    await categoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    const payload = res.send.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("Error while getting all categories");
    expect(payload.error).toBeDefined();

    logSpy.mockRestore();
  });
});
