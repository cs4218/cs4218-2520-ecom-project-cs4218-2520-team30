import slugify from "slugify";
import {
  categoryControlller,
  singleCategoryController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryCOntroller,
} from "./categoryController.js";
import categoryModel from "../models/categoryModel.js";

jest.mock("../models/categoryModel.js");
jest.mock("slugify");

const mockSave = jest.fn();
beforeEach(() => {
  categoryModel.mockImplementation(function (data) {
    return { save: mockSave };
  });
});

describe("Category Controllers", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue({ _id: "newId", name: "Test", slug: "test" });
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
  });

  it("singleCategoryController sends 500 when findOne rejects", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
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
  });

  it("createCategoryController returns 401 when name is missing", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    req.body = {};

    // ACT
    await createCategoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
  });

  it("createCategoryController returns 200 when category already exists", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    req.body = { name: "Electronics" };
    categoryModel.findOne.mockResolvedValue({ _id: "1", name: "Electronics" });

    // ACT
    await createCategoryController(req, res);

    // ASSERT
    expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Electronics" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category Already Exisits",
    });
  });

  it("createCategoryController creates category and returns 201", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    req.body = { name: "Gaming" };
    categoryModel.findOne.mockResolvedValue(null);
    slugify.mockReturnValue("gaming");
    const savedCategory = { _id: "1", name: "Gaming", slug: "gaming" };
    mockSave.mockResolvedValue(savedCategory);

    // ACT
    await createCategoryController(req, res);

    // ASSERT
    expect(categoryModel).toHaveBeenCalledWith({ name: "Gaming", slug: "gaming" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "new category created",
      category: savedCategory,
    });
  });

  it("createCategoryController sends 500 on error", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    req.body = { name: "Gaming" };
    categoryModel.findOne.mockResolvedValue(null);
    mockSave.mockRejectedValue(new Error("Save failed"));

    // ACT
    await createCategoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Errro in Category",
    });
  });

  it("updateCategoryController updates and returns 200", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    req.body = { name: "Updated" };
    req.params.id = "cat123";
    slugify.mockReturnValue("updated");
    const updatedCategory = { _id: "cat123", name: "Updated", slug: "updated" };
    categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);

    // ACT
    await updateCategoryController(req, res);

    // ASSERT
    expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "cat123",
      { name: "Updated", slug: "updated" },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      messsage: "Category Updated Successfully",
      category: updatedCategory,
    });
  });

  it("updateCategoryController sends 500 on error", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    req.body = { name: "Updated" };
    req.params.id = "cat123";
    categoryModel.findByIdAndUpdate.mockRejectedValue(new Error("Update failed"));

    // ACT
    await updateCategoryController(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error while updating category",
    });
  });

  it("deleteCategoryCOntroller deletes and returns 200", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    req.params.id = "cat123";
    categoryModel.findByIdAndDelete.mockResolvedValue({});

    // ACT
    await deleteCategoryCOntroller(req, res);

    // ASSERT
    expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("cat123");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Categry Deleted Successfully",
    });
  });

  it("deleteCategoryCOntroller sends 500 on error", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    req.params.id = "cat123";
    categoryModel.findByIdAndDelete.mockRejectedValue(new Error("Delete failed"));

    // ACT
    await deleteCategoryCOntroller(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "error while deleting category",
      error: expect.any(Error),
    });
  });
});
