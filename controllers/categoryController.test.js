import { jest } from "@jest/globals";
// import
import {
    createCategoryController,
    updateCategoryController,
    categoryControlller,
    singleCategoryController,
    deleteCategoryCOntroller,
} from "./categoryController.js";
import categoryModel from "../models/categoryModel.js";

// mock the category model
jest.mock("../models/categoryModel.js");

describe("Category Controller Tests", () => {
    let req, res;

    beforeEach(() => {
        // Reset request and response objects before each test
        req = {
            body: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        // Clear all mocks
        jest.clearAllMocks();
    });
    // Testing the CRUD operations
    // Tests:
    // 1. createCategoryController 4 tests
    // 2. updateCategoryController 2 tests
    // 3. categoryControlller 3 tests
    // 4. singleCategoryController 2 tests
    // 5. deleteCategoryCOntroller 2 tests
    // total tests: 13

    // createCategoryController
    describe("createCategoryController", () => {
        // test 1: create a new category successfully
        test("should create a new category successfully", async () => {
            req.body.name = "Electronics";

            // mock: category doesn't exist
            categoryModel.findOne.mockResolvedValue(null);

            // mock: save returns the new category
            categoryModel.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue({
                    name: "Electronics",
                    slug: "electronics",
                }),
            }));

            await createCategoryController(req, res);

            expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Electronics" });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "new category created",
                category: {
                    name: "Electronics",
                    slug: "electronics",
                },
            });
        });

        // test 2: return 401 if name is missing    
        test("should return 401 if name is missing", async () => {
            req.body = {}; // no category name provided

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
            expect(categoryModel.findOne).not.toHaveBeenCalled();
        });

        // test 3: return 200 if category already exists
        test("should return 200 if category already exists", async () => {
            req.body.name = "Books";

            // mock: category already exists
            categoryModel.findOne.mockResolvedValue({
                name: "Books",
                slug: "books",
            });

            await createCategoryController(req, res);

            expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Books" });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Category Already Exists",
            });
        });

        // test 4: return 500 on database error
        test("should return 500 on database error", async () => {
            req.body.name = "Clothing";

            // mock: database error
            categoryModel.findOne.mockRejectedValue(new Error("Database error"));

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error in Category",
                })
            );
        });
    });

    // updateCategoryController
    describe("updateCategoryController", () => {
        // test 1: update category successfully
        test("should update category successfully", async () => {
            req.body.name = "Updated Electronics";
            req.params.id = "123abc";

            const updatedCategory = {
                _id: "123abc",
                name: "Updated Electronics",
                slug: "updated-electronics",
            };

            categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);

            await updateCategoryController(req, res);

            expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "123abc",
                { name: "Updated Electronics", slug: "Updated-Electronics" },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Category Updated Successfully",
                category: updatedCategory,
            });
        });

        // test 2: return 500 on database error during update
        test("should return 500 on database error during update", async () => {
            req.body.name = "Updated Category";
            req.params.id = "123abc";

            categoryModel.findByIdAndUpdate.mockRejectedValue(new Error("Update failed"));

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error while updating category",
                })
            );
        });
    });

    // categoryControlller
    describe("categoryControlller (get all categories)", () => {
        // test 1: return all categories successfully
        test("should return all categories successfully", async () => {
            const mockCategories = [
                { name: "Books", slug: "books" },
                { name: "Electronics", slug: "electronics" },
                { name: "Clothing", slug: "clothing" },
            ];

            categoryModel.find.mockResolvedValue(mockCategories);

            await categoryControlller(req, res);

            expect(categoryModel.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "All Categories List",
                category: mockCategories,
            });
        });

        // test 2: return empty array when no categories exist
        test("should return empty array when no categories exist", async () => {
            categoryModel.find.mockResolvedValue([]);

            await categoryControlller(req, res);

            expect(categoryModel.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "All Categories List",
                category: [],
            });
        });

        // test 3: return 500 on database error
        test("should return 500 on database error", async () => {
            categoryModel.find.mockRejectedValue(new Error("Database connection failed"));

            await categoryControlller(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error while getting all categories",
                })
            );
        });
    });

    // singleCategoryController
    describe("singleCategoryController", () => {
        // test 1: return single category by slug successfully
        test("should return single category by slug successfully", async () => {
            req.params.slug = "electronics";

            const mockCategory = {
                name: "Electronics",
                slug: "electronics",
            };

            categoryModel.findOne.mockResolvedValue(mockCategory);

            await singleCategoryController(req, res);

            expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Get Single Category Successfully",
                category: mockCategory,
            });
        });

        // test 2: return 500 on database error
        test("should return 500 on database error", async () => {
            req.params.slug = "electronics";

            categoryModel.findOne.mockRejectedValue(new Error("Database error"));

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "Error While getting Single Category",
                })
            );
        });
    });

    // deleteCategoryCOntroller
    describe("deleteCategoryCOntroller", () => {
        // test 1: delete category successfully
        test("should delete category successfully", async () => {
            req.params.id = "123abc";

            categoryModel.findByIdAndDelete.mockResolvedValue({
                _id: "123abc",
                name: "Electronics",
            });

            await deleteCategoryCOntroller(req, res);

            expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("123abc");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Category Deleted Successfully",
            });
        });

        // test 2: return 500 on database error during deletion
        test("should return 500 on database error during deletion", async () => {
            req.params.id = "123abc";

            categoryModel.findByIdAndDelete.mockRejectedValue(new Error("Delete failed"));

            await deleteCategoryCOntroller(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "error while deleting category",
                })
            );
        });
    });
});
