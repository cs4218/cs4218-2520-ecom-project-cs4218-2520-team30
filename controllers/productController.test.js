import { jest } from "@jest/globals";
import {
    createProductController,
    updateProductController,
    getProductController,
    getSingleProductController,
    productPhotoController,
    productFiltersController,
    productListController,
    productCountController,
    searchProductController,
    relatedProductController,
    productCategoryController,
    braintreeTokenController,
    brainTreePaymentController,
    deleteProductController,
} from "./productController.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import fs from 'fs';
import slugify from 'slugify';
import braintree from "braintree";

// Mock all dependencies BEFORE importing the controller
jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");
jest.mock("../models/orderModel.js");
jest.mock('fs');
jest.mock('slugify');

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

describe('getProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        // No request body is needed for this controller
        req = {};

        // Mock Response
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test('should fetch products successfully with correct query chain', async () => {
        // 1. Arrange: Prepare the mock data and the chain
        const mockProducts = [
            { name: 'Laptop', category: 'Electronics' },
            { name: 'Phone', category: 'Electronics' }
        ];

        // Create a mock object that simulates the Mongoose chain
        const mockQueryChain = {
            populate: jest.fn().mockReturnThis(), // Returns self for chaining
            select: jest.fn().mockReturnThis(),   // Returns self for chaining
            limit: jest.fn().mockReturnThis(),    // Returns self for chaining
            sort: jest.fn().mockResolvedValue(mockProducts), // The FINAL call resolves the promise
        };

        // Tell productModel.find to return our chain object
        productModel.find.mockReturnValue(mockQueryChain);

        // 2. Act
        await getProductController(req, res);

        // 3. Assert: Verify the chain was built correctly
        expect(productModel.find).toHaveBeenCalledWith({});
        expect(mockQueryChain.populate).toHaveBeenCalledWith("category");
        expect(mockQueryChain.select).toHaveBeenCalledWith("-photo");
        expect(mockQueryChain.limit).toHaveBeenCalledWith(12);
        expect(mockQueryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });

        // Assert: Verify the response
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            countTotal: 2, // Matches the mockProducts length
            message: "All Products",
            products: mockProducts,
        });
    });

    test('should handle database errors and return 500', async () => {
        // 1. Arrange: Force an error
        const errorMessage = "Database connection lost";
        productModel.find.mockImplementation(() => {
            throw new Error(errorMessage);
        });

        // 2. Act
        await getProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error in getting products",
            error: errorMessage,
        });
    });
});

describe('getSingleProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        // No request body is needed for this controller
        req = {
            params: { slug: 'test-product-slug' }
        };

        // Mock Response
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test('should fetch a single product successfully', async () => {
        // 1. Arrange: Prepare the mock data and the chain
        const mockProduct = { name: 'Laptop', category: 'Electronics', slug: 'test-product-slug' };

        // Create a mock object that simulates the Mongoose chain
        const mockQueryChain = {
            select: jest.fn().mockReturnThis(),   // Returns self for chaining
            populate: jest.fn().mockResolvedValue(mockProduct),

        };

        // Tell productModel.find to return our chain object
        productModel.findOne.mockReturnValue(mockQueryChain);

        // 2. Act
        await getSingleProductController(req, res);

        // 3. Assert: Verify the chain was built correctly
        expect(productModel.findOne).toHaveBeenCalledWith({ slug: 'test-product-slug' });
        expect(mockQueryChain.populate).toHaveBeenCalledWith("category");
        expect(mockQueryChain.select).toHaveBeenCalledWith("-photo");

        // Assert: Verify the response
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Single Product Fetched",
            product: mockProduct,
        });
    });

    test('should handle database errors and return 500', async () => {
        // 1. Arrange: Force an error
        const errorMessage = "Database connection lost";
        productModel.findOne.mockImplementation(() => {
            throw new Error(errorMessage);
        });

        // 2. Act
        await getSingleProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while getting single product",
                error: expect.any(Error)
            })
        );
    });

});

describe('productPhotoController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Request with a product ID
        req = {
            params: { pid: '12345' }
        };

        // Mock Response including the 'set' method
        res = {
            set: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test('should fetch and serve product photo successfully', async () => {
        // 1. Arrange: Create mock data
        const mockPhotoData = Buffer.from('fake-image-content');
        const mockProduct = {
            photo: {
                data: mockPhotoData,
                contentType: 'image/png'
            }
        };

        // Mock the Mongoose chain: findById() -> select()
        // Since we await the result of select(), it must resolve the promise
        const mockQueryChain = {
            select: jest.fn().mockResolvedValue(mockProduct)
        };

        productModel.findById.mockReturnValue(mockQueryChain);

        // 2. Act
        await productPhotoController(req, res);

        // 3. Assert
        // Verify the database query
        expect(productModel.findById).toHaveBeenCalledWith('12345');
        expect(mockQueryChain.select).toHaveBeenCalledWith("photo");

        // Verify the response headers and body
        expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockPhotoData);
    });

    test('should not send response if photo data is missing', async () => {
        // 1. Arrange: Product exists but has no photo data
        const mockProduct = { photo: {} }; // no .data property

        const mockQueryChain = {
            select: jest.fn().mockResolvedValue(mockProduct)
        };
        productModel.findById.mockReturnValue(mockQueryChain);

        // 2. Act
        await productPhotoController(req, res);

        // 3. Assert: Verify nothing was sent
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
        expect(res.set).not.toHaveBeenCalled();
    });

    test('should handle database errors and return 500', async () => {
        // 1. Arrange: Force an error in the chain
        const errorMessage = "Error fetching photo";
        productModel.findById.mockImplementation(() => {
            throw new Error(errorMessage);
        });

        // 2. Act
        await productPhotoController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while getting photo",
                error: expect.objectContaining({ message: errorMessage })
            })
        );
    });

});

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

describe('productFiltersController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Request
        req = {
            body: {
                checked: [],
                radio: []
            }
        };

        // Mock Response
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test('should filter products by category only', async () => {
        req.body.checked = ['category1', 'category2'];
        const mockProducts = [
            { name: 'Product 1', category: 'category1' },
            { name: 'Product 2', category: 'category2' }
        ];

        productModel.find.mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            category: ['category1', 'category2']
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    test('should filter products by price range only', async () => {
        req.body.radio = [100, 500];
        const mockProducts = [
            { name: 'Product 1', price: 150 },
            { name: 'Product 2', price: 300 }
        ];

        productModel.find.mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            price: { $gte: 100, $lte: 500 }
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    test('should filter products by both category and price range', async () => {
        req.body.checked = ['electronics'];
        req.body.radio = [200, 1000];
        const mockProducts = [
            { name: 'Laptop', category: 'electronics', price: 800 }
        ];

        productModel.find.mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            category: ['electronics'],
            price: { $gte: 200, $lte: 1000 }
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    test('should return all products when no filters applied', async () => {
        const mockProducts = [
            { name: 'Product 1' },
            { name: 'Product 2' }
        ];

        productModel.find.mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    test('should handle database errors and return 400', async () => {
        const errorMessage = "Database error";
        productModel.find.mockRejectedValue(new Error(errorMessage));

        await productFiltersController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error While Filtering Products",
                error: expect.any(Error)
            })
        );
    });
});

describe('productCountController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test('should return total product count successfully', async () => {
        const mockCount = 42;

        const mockQueryChain = {
            estimatedDocumentCount: jest.fn().mockResolvedValue(mockCount)
        };

        productModel.find.mockReturnValue(mockQueryChain);

        await productCountController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(mockQueryChain.estimatedDocumentCount).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            total: mockCount
        });
    });

    test('should handle database errors and return 400', async () => {
        const errorMessage = "Database error";
        productModel.find.mockImplementation(() => {
            throw new Error(errorMessage);
        });

        await productCountController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error in product count",
                error: expect.any(Error)
            })
        );
    });
});

describe('productListController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Request
        req = {
            params: {}
        };

        // Mock Response
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test('should return first page of products when no page specified', async () => {
        const mockProducts = [
            { name: 'Product 1' },
            { name: 'Product 2' },
            { name: 'Product 3' }
        ];

        // Create mock query chain
        const mockQueryChain = {
            select: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockProducts)
        };

        productModel.find.mockReturnValue(mockQueryChain);

        await productListController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(mockQueryChain.select).toHaveBeenCalledWith("-photo");
        expect(mockQueryChain.skip).toHaveBeenCalledWith(0); // (1-1) * 6 = 0
        expect(mockQueryChain.limit).toHaveBeenCalledWith(6);
        expect(mockQueryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    test('should return second page of products', async () => {
        req.params.page = 2;
        const mockProducts = [
            { name: 'Product 7' },
            { name: 'Product 8' }
        ];

        const mockQueryChain = {
            select: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockProducts)
        };

        productModel.find.mockReturnValue(mockQueryChain);

        await productListController(req, res);

        expect(mockQueryChain.skip).toHaveBeenCalledWith(6); // (2-1) * 6 = 6
        expect(mockQueryChain.limit).toHaveBeenCalledWith(6);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    test('should return third page of products', async () => {
        req.params.page = 3;
        const mockProducts = [{ name: 'Product 13' }];

        const mockQueryChain = {
            select: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockProducts)
        };

        productModel.find.mockReturnValue(mockQueryChain);

        await productListController(req, res);

        expect(mockQueryChain.skip).toHaveBeenCalledWith(12); // (3-1) * 6 = 12
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should handle database errors and return 400', async () => {
        const errorMessage = "Database connection error";
        productModel.find.mockImplementation(() => {
            throw new Error(errorMessage);
        });

        await productListController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "error in per page ctrl",
                error: expect.any(Error)
            })
        );
    });
});

describe('searchProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            params: {
                keyword: 'laptop'
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn()
        };
    });

    test('should search products by keyword in name or description', async () => {
        const mockProducts = [
            { name: 'Gaming Laptop', description: 'High-performance laptop' },
            { name: 'Office Computer', description: 'Includes laptop accessories' }
        ];

        const mockQueryChain = {
            select: jest.fn().mockResolvedValue(mockProducts)
        };

        productModel.find.mockReturnValue(mockQueryChain);

        await searchProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: 'laptop', $options: 'i' } },
                { description: { $regex: 'laptop', $options: 'i' } }
            ]
        });
        expect(mockQueryChain.select).toHaveBeenCalledWith('-photo');
        expect(res.json).toHaveBeenCalledWith(mockProducts);
    });

    test('should return empty array when no products match keyword', async () => {
        req.params.keyword = 'nonexistent';
        const mockProducts = [];

        const mockQueryChain = {
            select: jest.fn().mockResolvedValue(mockProducts)
        };

        productModel.find.mockReturnValue(mockQueryChain);

        await searchProductController(req, res);

        expect(res.json).toHaveBeenCalledWith([]);
    });

    test('should handle database errors and return 400', async () => {
        const errorMessage = "Database search error";
        productModel.find.mockImplementation(() => {
            throw new Error(errorMessage);
        });

        await searchProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error In Search Product API",
                error: expect.any(Error)
            })
        );
    });
});

describe('relatedProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            params: {
                pid: 'product123',
                cid: 'category456'
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });

    test('should fetch related products in same category excluding current product', async () => {
        const mockProducts = [
            { _id: 'product789', name: 'Related Product 1', category: 'category456' },
            { _id: 'product101', name: 'Related Product 2', category: 'category456' }
        ];

        const mockQueryChain = {
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockResolvedValue(mockProducts)
        };

        productModel.find.mockReturnValue(mockQueryChain);

        await relatedProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            category: 'category456',
            _id: { $ne: 'product123' }
        });
        expect(mockQueryChain.select).toHaveBeenCalledWith('-photo');
        expect(mockQueryChain.limit).toHaveBeenCalledWith(3);
        expect(mockQueryChain.populate).toHaveBeenCalledWith('category');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts
        });
    });

    test('should return empty array when no related products found', async () => {
        const mockProducts = [];

        const mockQueryChain = {
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockResolvedValue(mockProducts)
        };

        productModel.find.mockReturnValue(mockQueryChain);

        await relatedProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: []
        });
    });

    test('should handle database errors and return 400', async () => {
        const errorMessage = "Database error";
        productModel.find.mockImplementation(() => {
            throw new Error(errorMessage);
        });

        await relatedProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "error while getting related product",
                error: expect.any(Error)
            })
        );
    });
});

describe('productCategoryController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            params: {
                slug: 'electronics'
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });

    test('should fetch products by category slug', async () => {
        const mockCategory = {
            _id: 'category123',
            name: 'Electronics',
            slug: 'electronics'
        };

        const mockProducts = [
            { _id: 'product1', name: 'Laptop', category: mockCategory },
            { _id: 'product2', name: 'Phone', category: mockCategory }
        ];

        categoryModel.findOne.mockResolvedValue(mockCategory);

        const mockQueryChain = {
            populate: jest.fn().mockResolvedValue(mockProducts)
        };

        productModel.find.mockReturnValue(mockQueryChain);

        await productCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'electronics' });
        expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
        expect(mockQueryChain.populate).toHaveBeenCalledWith('category');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            category: mockCategory,
            products: mockProducts
        });
    });

    test('should return empty products when category has no products', async () => {
        const mockCategory = {
            _id: 'category456',
            name: 'Empty Category',
            slug: 'empty-category'
        };

        categoryModel.findOne.mockResolvedValue(mockCategory);

        const mockQueryChain = {
            populate: jest.fn().mockResolvedValue([])
        };

        productModel.find.mockReturnValue(mockQueryChain);

        await productCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            category: mockCategory,
            products: []
        });
    });

    test('should handle database errors and return 400', async () => {
        const errorMessage = "Database error";
        categoryModel.findOne.mockRejectedValue(new Error(errorMessage));

        await productCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error While Getting products",
                error: expect.any(Error)
            })
        );
    });
});

describe('braintreeTokenController', () => {
    let req, res;

    // FIX: Capture the instance HERE, immediately after imports but before 
    // beforeEach() clears the history.
    // This gets the exact object your controller is using.
    const mockInstance = braintree.BraintreeGateway.mock.results[0].value;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });
    test('should catch internal errors during token generation', async () => {
        // 1. Arrange: Make the generate function THROW an error immediately
        const internalError = new Error('Unexpected crash');

        // This simulates a crash in the library itself or the call
        mockInstance.clientToken.generate.mockImplementation(() => {
            throw internalError;
        });

        // Spy on console.log to verify it was called
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // 2. Act
        await braintreeTokenController(req, res);

        // 3. Assert
        expect(consoleSpy).toHaveBeenCalledWith(internalError);

        // Cleanup the spy
        consoleSpy.mockRestore();
    });
    test('should return a client token on success', async () => {
        // 1. Get the mocked method from our captured instance
        const mockGenerate = mockInstance.clientToken.generate;

        // 2. Setup the success response
        const mockResponse = { clientToken: 'fake-token-123' };

        // Implementation: (options, callback) => callback(null, response)
        mockGenerate.mockImplementation((options, callback) => {
            callback(null, mockResponse);
        });

        // 3. Act
        await braintreeTokenController(req, res);

        // 4. Assert
        expect(mockGenerate).toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith(mockResponse);
    });

    test('should return 500 if Braintree returns an error', async () => {
        // 1. Get the mocked method
        const mockGenerate = mockInstance.clientToken.generate;

        // 2. Setup the error
        const mockError = new Error('Braintree connection failed');

        // Implementation: (options, callback) => callback(error, null)
        mockGenerate.mockImplementation((options, callback) => {
            callback(mockError, null);
        });

        // 3. Act
        await braintreeTokenController(req, res);

        // 4. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(mockError);
    });
});

describe('brainTreePaymentController', () => {
    let req, res;

    // 1. Capture the Braintree instance (Must be outside beforeEach to persist)
    // We use the same instance that was created when the controller file loaded.
    const mockInstance = braintree.BraintreeGateway.mock.results[0].value;
    const mockSale = mockInstance.transaction.sale;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Request with Cart and User
        req = {
            body: {
                nonce: 'fake-nonce-123',
                cart: [
                    { price: 100 },
                    { price: 50 },
                    { price: 50 } // Total should be 200
                ]
            },
            user: { _id: 'user-id-999' }
        };

        // Mock Response
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });

    test('should process payment and save order successfully', async () => {
        // 1. Arrange: Mock successful Braintree Sale
        const mockResult = { success: true, transaction: { id: 'trans_abc' } };

        // Mock the implementation to call the callback: function(error, result)
        mockSale.mockImplementation((data, callback) => {
            callback(null, mockResult);
        });

        // Mock the Order Model to ensure save() works
        const mockSave = jest.fn().mockResolvedValue(true);
        orderModel.mockImplementation(() => ({
            save: mockSave
        }));

        // 2. Act
        await brainTreePaymentController(req, res);

        // 3. Assert
        // Check calculation: 100 + 50 + 50 = 200
        expect(mockSale).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: 200,
                paymentMethodNonce: 'fake-nonce-123',
                options: { submitForSettlement: true }
            }),
            expect.any(Function)
        );

        // Verify order creation
        expect(orderModel).toHaveBeenCalledWith({
            products: req.body.cart,
            payment: mockResult,
            buyer: 'user-id-999'
        });

        // Verify order save and response
        expect(mockSave).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test('should return 500 if Braintree transaction fails', async () => {
        // 1. Arrange: Mock Braintree Error
        const mockError = new Error('Payment Rejected');

        // Mock callback with error: function(error, result)
        mockSale.mockImplementation((data, callback) => {
            callback(mockError, null);
        });

        // 2. Act
        await brainTreePaymentController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(mockError);
        // Ensure we didn't try to save an order
        expect(orderModel).not.toHaveBeenCalled();
    });

    test('should catch internal errors (console.log)', async () => {
        // 1. Arrange: Force a crash by making req.body undefined
        // This will cause "Cannot destructure property 'nonce' of 'undefined'"
        req.body = undefined;

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // 2. Act
        await brainTreePaymentController(req, res);

        // 3. Assert
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

        consoleSpy.mockRestore();
    });
});