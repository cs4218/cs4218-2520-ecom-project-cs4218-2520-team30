import {
    categoryController,
    singleCategoryController,
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
} from "./categoryController.js";
import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";

jest.mock("../models/categoryModel.js");
jest.mock("slugify");
const mockSave = jest.fn();
beforeEach(() => {
    categoryModel.mockImplementation(function (data) {
        return { save: mockSave };
    });
});


// mock the category model
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
            // ARRANGE
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

            // ACT
            await createCategoryController(req, res);

            // ASSERT
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
            // ARRANGE
            req.body = {}; // no category name provided

            // ACT
            await createCategoryController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
            expect(categoryModel.findOne).not.toHaveBeenCalled();
        });

        // Alek Kwek, A0273471A
        test("should return 200 if category already exists", async () => {
            // ARRANGE
            req.body.name = "Books";

            // mock: category already exists
            categoryModel.findOne.mockResolvedValue({
                name: "Books",
                slug: "books",
            });

            // ACT
            await createCategoryController(req, res);

            // ASSERT
            expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Books" });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category Already Exists",
            });
        });

        // Alek Kwek, A0273471A
        test("should return 500 on database error", async () => {
            // ARRANGE
            req.body.name = "Clothing";
            const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            const mockError = new Error("Database error");
            // mock: database error
            categoryModel.findOne.mockRejectedValue(mockError);

            // ACT
            await createCategoryController(req, res);

            // ASSERT
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
            // ARRANGE
            req.body.name = "Updated Electronics";
            req.params.id = "123abc";

            const updatedCategory = {
                _id: "123abc",
                name: "Updated Electronics",
                slug: "updated-electronics",
            };
            slugify.mockReturnValue("Updated-Electronics");

            categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);

            // ACT
            await updateCategoryController(req, res);

            // ASSERT
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
            // ARRANGE
            req.body.name = "Updated Category";
            req.params.id = "123abc";
            const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            const mockError = new Error("Update failed");
            categoryModel.findByIdAndUpdate.mockRejectedValue(mockError);

            // ACT
            await updateCategoryController(req, res);

            // ASSERT
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
        // Alek Kwek, A0273471A
        test("should return 400 if name is missing during update", async () => {
            // ARRANGE
            req.body = {}; // no name provided
            req.params.id = "123abc";

            // ACT
            await updateCategoryController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
            expect(categoryModel.findByIdAndUpdate).not.toHaveBeenCalled();
        });
    });

    // deleteCategoryController
    // Alek Kwek, A0273471A
    describe("deleteCategoryController", () => {
        test("should delete category successfully", async () => {
            // ARRANGE
            req.params.id = "123abc";

            categoryModel.findByIdAndDelete.mockResolvedValue({
                _id: "123abc",
                name: "Electronics",
            });

            // ACT
            await deleteCategoryController(req, res);

            // ASSERT
            expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("123abc");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Category Deleted Successfully",
            });
        });

        test("should return 500 on database error during deletion", async () => {
            // ARRANGE
            req.params.id = "123abc";
            const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            const mockError = new Error("Delete failed");
            categoryModel.findByIdAndDelete.mockRejectedValue(mockError);

            // ACT
            await deleteCategoryController(req, res);

            // ASSERT
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
        await categoryController(req, res);

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
            message: "Get Single Category Successfully",
            category: mockCategory,
        });
    });

    it("categoryController sends 500 when find rejects", async () => {
        // Lum Yi Ren Johannsen, A0273503L
        // ARRANGE
        categoryModel.find.mockRejectedValue(new Error("DB error"));

        // ACT
        await categoryController(req, res);

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


});

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
        await categoryController(req, res);

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
            message: "Get Single Category Successfully",
            category: mockCategory,
        });
    });

    it("categoryController sends 500 when find rejects", async () => {
        // Lum Yi Ren Johannsen, A0273503L
        // ARRANGE
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        categoryModel.find.mockRejectedValue(new Error("DB error"));

        // ACT
        await categoryController(req, res);

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
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
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
