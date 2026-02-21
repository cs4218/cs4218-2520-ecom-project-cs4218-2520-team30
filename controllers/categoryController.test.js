import {
  categoryControlller,
  singleCategoryController,
} from "./categoryController.js";
import categoryModel from "../models/categoryModel.js";

jest.mock("../models/categoryModel.js");

describe("Category Controllers", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it("should retrieve all categories successfully", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockCategories = [
      { _id: "1", name: "Electronics", slug: "electronics" },
      { _id: "2", name: "Books", slug: "books" },
    ];
    categoryModel.find.mockResolvedValue(mockCategories);

    // ACT
    await categoryControlller(req, res);

    // ASSERT
    expect(categoryModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "All Categories List",
      category: mockCategories,
    });
  });

  it("should retrieve a single category by slug", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockCategory = { _id: "1", name: "Electronics", slug: "electronics" };
    req.params.slug = "electronics";
    categoryModel.findOne.mockResolvedValue(mockCategory);

    // ACT
    await singleCategoryController(req, res);

    // ASSERT
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Get SIngle Category SUccessfully",
      category: mockCategory,
    });
  });

  it("categoryControlller sends 500 when find rejects", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    categoryModel.find.mockRejectedValue(new Error("DB error"));

    // ACT
    await categoryControlller(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error while getting all categories",
    });
    consoleSpy.mockRestore();
  });

  it("singleCategoryController sends 500 when findOne rejects", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    req.params.slug = "electronics";
    categoryModel.findOne.mockRejectedValue(new Error("DB error"));

    // ACT
    await singleCategoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error While getting Single Category",
    });
    consoleSpy.mockRestore();
  });
});
