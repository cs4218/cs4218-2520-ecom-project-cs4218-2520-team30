import { jest } from "@jest/globals";
// import
import {
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
} from "./categoryController.js";
import categoryModel from "../models/categoryModel.js";

// Alek Kwek, A0273471A
// mock the category model
jest.mock("../models/categoryModel.js");
// Alek Kwek, A0273471A
describe("Category Controller Tests", () => {
    let req, res;
    // Alek Kwek, A0273471A
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

    // createCategoryController
    // Alek Kwek, A0273471A
    describe("createCategoryController", () => {
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
                message: "New Category Created",
                category: {
                    name: "Electronics",
                    slug: "electronics",
                },
            });
        });

        // Alek Kwek, A0273471A
        test("should return 400 if name is missing", async () => {
            req.body = {}; // no category name provided

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
            expect(categoryModel.findOne).not.toHaveBeenCalled();
        });

        // Alek Kwek, A0273471A
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
                success: false,
                message: "Category Already Exists",
            });
        });

        // Alek Kwek, A0273471A
        test("should return 500 on database error", async () => {
            req.body.name = "Clothing";
            const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            const mockError = new Error("Database error");
            // mock: database error
            categoryModel.findOne.mockRejectedValue(mockError);

            await createCategoryController(req, res);

            expect(logSpy).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: mockError,
                    message: "Error in Category",
                })
            );
            logSpy.mockRestore();
        });
    });

    // updateCategoryController
    // Alek Kwek, A0273471A
    describe("updateCategoryController", () => {

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

        // Alek Kwek, A0273471A
        test("should return 500 on database error during update", async () => {
            req.body.name = "Updated Category";
            req.params.id = "123abc";
            const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            const mockError = new Error("Update failed");
            categoryModel.findByIdAndUpdate.mockRejectedValue(mockError);

            await updateCategoryController(req, res);

            expect(logSpy).toHaveBeenCalledWith(mockError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: mockError,
                    message: "Error while updating category",
                })
            );
            logSpy.mockRestore();
        });
    });

    // deleteCategoryController
    // Alek Kwek, A0273471A
    describe("deleteCategoryController", () => {
        test("should delete category successfully", async () => {
            req.params.id = "123abc";

            categoryModel.findByIdAndDelete.mockResolvedValue({
                _id: "123abc",
                name: "Electronics",
            });

            await deleteCategoryController(req, res);

            expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("123abc");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Category Deleted Successfully",
            });
        });

        test("should return 500 on database error during deletion", async () => {
            req.params.id = "123abc";
            const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            const mockError = new Error("Delete failed");
            categoryModel.findByIdAndDelete.mockRejectedValue(mockError);

            await deleteCategoryController(req, res);

            expect(logSpy).toHaveBeenCalledWith(mockError);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: "error while deleting category",
                })
            );
            logSpy.mockRestore();
        });
    });
});
