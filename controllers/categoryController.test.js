import slugify from "slugify";
import {
    categoryController,
    singleCategoryController,
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
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
            message: "Get SIngle Category SUccessfully",
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

    it("deleteCategoryController deletes and returns 200", async () => {
        // Lum Yi Ren Johannsen, A0273503L
        // ARRANGE
        req.params.id = "cat123";
        categoryModel.findByIdAndDelete.mockResolvedValue({});

        // ACT
        await deleteCategoryController(req, res);

        // ASSERT
        expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("cat123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Categry Deleted Successfully",
        });
    });

    it("deleteCategoryController sends 500 on error", async () => {
        // Lum Yi Ren Johannsen, A0273503L
        // ARRANGE
        req.params.id = "cat123";
        categoryModel.findByIdAndDelete.mockRejectedValue(new Error("Delete failed"));

        // ACT
        await deleteCategoryController(req, res);

        // ASSERT
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "error while deleting category",
            error: expect.any(Error),
        });
    });
});