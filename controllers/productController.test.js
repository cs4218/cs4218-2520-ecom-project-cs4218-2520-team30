import { jest } from "@jest/globals";
import {
    createProductController,
    updateProductController,
    deleteProductController,
} from "./productController.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import fs from 'fs';
import slugify from 'slugify';
import braintree from "braintree";

// Mock all dependencies BEFORE importing the controller
jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");
jest.mock('fs');
jest.mock('slugify');

// Alek Kwek, A0273471A
jest.mock('braintree', () => ({
    BraintreeGateway: jest.fn().mockImplementation(() => ({
        clientToken: {
            generate: jest.fn()
        },
        transaction: {
            sale: jest.fn()
        }
    })),
    Environment: {
        Sandbox: 'sandbox'
    }
}));

// Alek Kwek, A0273471A
describe('createProductController', () => {
    let req, res;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        //jest.spyOn(console, 'log').mockImplementation(() => { });
        // Mock Request and Response objects
        req = {
            fields: {
                name: 'Test Product',
                description: 'Test Description',
                price: 100,
                category: 'electronics',
                quantity: 10,
                shipping: true
            },
            files: {
                photo: {
                    path: '/fake/path/image.jpg',
                    type: 'image/jpeg',
                    size: 500000 // 0.5MB
                }
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        slugify.mockReturnValue('test-product');
    });

    test('should successfully create a product', async () => {
        // Mock the product instance and .save() method
        const mockSave = jest.fn().mockResolvedValue(true);
        productModel.mockImplementation(() => ({
            save: mockSave,
            photo: {}
        }));

        fs.readFileSync.mockReturnValue(Buffer.from('fake-image-data'));

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Product Created Successfully"
            })
        );
        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    test('should return 500 if name is missing', async () => {
        req.fields.name = ""; // Trigger validation error

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    test('should return 500 if description is missing', async () => {
        req.fields.description = ""; // Trigger validation error

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
    });

    test('should return 500 if price is missing', async () => {
        req.fields.price = ""; // Trigger validation error

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
    });

    test('should return 500 if category is missing', async () => {
        req.fields.category = ""; // Trigger validation error

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
    });

    test('should return 500 if quantity is missing', async () => {
        req.fields.quantity = ""; // Trigger validation error

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
    });

    test('should return 500 if photo size is greater than 1MB', async () => {
        req.files.photo.size = 2000000; // 2MB

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: "Photo is Required and should be less than 1mb"
        });
    });

    test('should handle internal errors and return 500', async () => {
        productModel.mockImplementation(() => {
            throw new Error('Database Error');
        });

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error in creating product"
            })
        );
    });

    test('should successfully create a product without a photo', async () => {
        // Remove photo from request to test the else branch of line 44
        req.files = {}; // No photo provided

        // Mock the product instance and .save() method
        const mockSave = jest.fn().mockResolvedValue(true);
        productModel.mockImplementation(() => ({
            save: mockSave,
            photo: {}
        }));

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Product Created Successfully"
            })
        );
        expect(mockSave).toHaveBeenCalledTimes(1);
        // Verify that fs.readFileSync was NOT called since there's no photo
        expect(fs.readFileSync).not.toHaveBeenCalled();
    });
});

// Alek Kwek, A0273471A
describe('updateProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Request and Response objects
        req = {
            params: { pid: 'product123' },
            fields: {
                name: "Updated Laptop",
                description: "Updated high-performance laptop",
                price: 1500,
                category: "electronics123",
                quantity: 15,
                shipping: true
            },
            files: {
                photo: {
                    path: "/tmp/photo.jpg",
                    type: "image/jpeg",
                    size: 500000 // 500KB
                }
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        // Mock slugify
        slugify.mockReturnValue('updated-laptop');

        // Mock fs.readFileSync
        fs.readFileSync.mockReturnValue(Buffer.from('fake-image-data'));
    });

    test('should successfully update a product with photo', async () => {
        // Mock the product object with save method
        const mockProduct = {
            _id: 'product123',
            name: 'Updated Laptop',
            photo: {},
            save: jest.fn().mockResolvedValue(true)
        };

        productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

        await updateProductController(req, res);

        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
            'product123',
            expect.objectContaining({
                name: "Updated Laptop",
                slug: 'updated-laptop'
            }),
            { new: true }
        );
        expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/photo.jpg");
        expect(mockProduct.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Product Updated Successfully"
            })
        );
    });

    test('should successfully update a product without photo', async () => {
        req.files.photo = null; // No photo provided

        const mockProduct = {
            _id: 'product123',
            name: 'Updated Laptop',
            save: jest.fn().mockResolvedValue(true)
        };

        productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

        await updateProductController(req, res);

        expect(fs.readFileSync).not.toHaveBeenCalled();
        expect(mockProduct.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should return 500 if name is missing', async () => {
        req.fields.name = "";

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    test('should return 500 if description is missing', async () => {
        req.fields.description = "";

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
    });

    test('should return 500 if price is missing', async () => {
        req.fields.price = "";

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
    });

    test('should return 500 if category is missing', async () => {
        req.fields.category = "";

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
    });

    test('should return 500 if quantity is missing', async () => {
        req.fields.quantity = "";

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
    });

    test('should return 500 if photo size is greater than 1MB', async () => {
        req.files.photo.size = 2000000; // 2MB

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: "Photo is Required and should be less than 1mb"
        });
    });

    test('should handle internal errors and return 500', async () => {
        productModel.findByIdAndUpdate.mockRejectedValue(new Error('Database Error'));

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error In Updating Product"
            })
        );
    });
});

// Alek Kwek, A0273471A
describe('deleteProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Request with a product ID
        req = {
            params: { pid: '12345abc' }
        };

        // Mock Response
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test('should delete a product successfully', async () => {
        // 1. Arrange: Mock the Mongoose chain
        const mockQueryChain = {
            select: jest.fn().mockResolvedValue({ _id: '12345abc', name: 'Deleted Product' })
        };

        productModel.findByIdAndDelete.mockReturnValue(mockQueryChain);

        // 2. Act
        await deleteProductController(req, res);

        // 3. Assert
        expect(productModel.findByIdAndDelete).toHaveBeenCalledWith('12345abc');
        expect(mockQueryChain.select).toHaveBeenCalledWith("-photo");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Product Deleted successfully",
        });
    });

    test('should handle database errors and return 500', async () => {
        // 1. Arrange: Force an error
        const errorMessage = "Database error during deletion";
        productModel.findByIdAndDelete.mockImplementation(() => {
            throw new Error(errorMessage);
        });

        // 2. Act
        await deleteProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while deleting product",
                error: expect.any(Error)
            })
        );
    });
});
