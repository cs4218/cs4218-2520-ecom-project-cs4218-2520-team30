import braintree from "braintree";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import fs from "fs";
import slugify from "slugify";
import {
    createProductController,
    updateProductController,
    getProductController,
    getSingleProductController,
    productPhotoController,
    deleteProductController,
    productFiltersController,
    productCountController,
    productListController,
    searchProductController,
    productCategoryController,
    relatedProductController,
    braintreeTokenController,
    brainTreePaymentController
} from "./productController.js";
jest.mock("braintree", () => {
    const mockGenerate = jest.fn();
    const mockSale = jest.fn();
    const Gateway = jest.fn().mockImplementation(() => ({
        clientToken: { generate: mockGenerate },
        transaction: { sale: mockSale },
    }));
    Gateway._mockGenerate = mockGenerate;
    Gateway._mockSale = mockSale;
    return {
        BraintreeGateway: Gateway,
        Environment: { Sandbox: "Sandbox" },
    };
});



const mockGenerate = braintree.BraintreeGateway._mockGenerate;
const mockSale = braintree.BraintreeGateway._mockSale;
// 1. Mock productModel as a Constructor + Static Methods
jest.mock("../models/productModel.js", () => {
    const mockProductInstance = {
        save: jest.fn().mockResolvedValue(true),
        photo: { data: null, contentType: null },
    };

    const mockConstructor = jest.fn(() => mockProductInstance);

    // Attach static methods to the constructor function
    mockConstructor.find = jest.fn();
    mockConstructor.findOne = jest.fn();
    mockConstructor.findById = jest.fn();
    mockConstructor.findByIdAndDelete = jest.fn();
    mockConstructor.findByIdAndUpdate = jest.fn();
    mockConstructor.countDocuments = jest.fn(); // Needed for productCountController

    return {
        __esModule: true,
        default: mockConstructor,
    };
});

// 2. Mock categoryModel
jest.mock("../models/categoryModel.js", () => ({
    __esModule: true,
    default: {
        findOne: jest.fn(),
    },
}));

// 3. Mock fs (to prevent ReferenceErrors)
jest.mock("fs", () => ({
    readFileSync: jest.fn(),
}));

// Stub order model so brainTreePaymentController does not touch the real DB.
jest.mock("../models/orderModel.js", () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(function () {
            return { save: mockSave };
        }),
    };
});

// Removed duplicate mocks
jest.mock('slugify');


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
        // 1. Arrange: Mock the product instance and .save() method

        const mockSave = jest.fn().mockResolvedValue(true);
        const mockProduct = {
            save: mockSave,
            photo: {},
            name: "Test Product", // Added for clarity
            _id: "12345"          // Added for clarity
        };

        productModel.mockImplementation(() => mockProduct);

        fs.readFileSync.mockReturnValue(Buffer.from('fake-image-data'));

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Product Created Successfully",
                products: mockProduct // Validate that the product object is returned
            })
        );
        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    test('should return 400 if name is missing', async () => {
        // 1. Arrange
        req.fields.name = ""; // Trigger validation error

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    test('should return 400 if description is missing', async () => {
        // 1. Arrange
        req.fields.description = ""; // Trigger validation error

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
    });

    test('should return 400 if price is missing', async () => {
        // 1. Arrange
        req.fields.price = ""; // Trigger validation error

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
    });

    test('should return 400 if category is missing', async () => {
        // 1. Arrange
        req.fields.category = ""; // Trigger validation error

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
    });

    test('should return 400 if quantity is missing', async () => {
        // 1. Arrange
        req.fields.quantity = ""; // Trigger validation error

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
    });

    test('should return 400 if photo size is greater than 1MB', async () => {
        // 1. Arrange
        req.files.photo.size = 2000000; // 2MB

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            error: "Photo is Required to be less than 1mb"
        });
    });

    test('should handle internal errors and return 500', async () => {
        // 1. Arrange: Create the specific error we expect to see returned
        const mockError = new Error('Database Error');

        productModel.mockImplementation(() => {
            throw mockError;
        });

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error in creating product",
                error: mockError // <--- Added this line to satisfy the "expect for error" comment
            })
        );
    });

    test('should successfully create a product without a photo', async () => {
        // 1. Arrange: Remove photo from request to test the else branch
        req.files = {};

        const mockSave = jest.fn().mockResolvedValue(true);

        // Define specific mock object to verify it is returned
        const mockProduct = {
            save: mockSave,
            photo: {},
            name: "Product No Photo",
            _id: "no-photo-id"
        };

        productModel.mockImplementation(() => mockProduct);

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Product Created Successfully",
                products: mockProduct
            })
        );
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    // BVA Tests for createProductController
    test('should return 400 if price is negative', async () => {
        // 1. Arrange
        req.fields.price = -1;

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: "Price must be non-negative" });
    });

    test('should return 400 if quantity is negative', async () => {
        // 1. Arrange
        req.fields.quantity = -1;

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: "Quantity must be non-negative" });
    });

    test('should allow quantity 0', async () => {
        // 1. Arrange
        req.fields.quantity = 0;
        const mockSave = jest.fn().mockResolvedValue(true);
        productModel.mockImplementation(() => ({ save: mockSave, photo: {} }));

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should return 400 if photo size is greater than 1MB (Boundary + 1)', async () => {
        // 1. Arrange
        req.files.photo.size = 1000001; // 1MB + 1 byte

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            error: "Photo is Required to be less than 1mb"
        });
    });

    test('should allow photo size equal to 1MB (Boundary)', async () => {
        // 1. Arrange
        req.files.photo.size = 1000000; // 1MB exact
        const mockSave = jest.fn().mockResolvedValue(true);
        productModel.mockImplementation(() => ({ save: mockSave, photo: {} }));

        // 2. Act
        await createProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(201);
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
            select: jest.fn()
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
        // 1. Arrange: Spy on console.log to suppress output & verify call
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // Force an error
        const errorMessage = "Database error during deletion";
        const errorObject = new Error(errorMessage);

        productModel.findByIdAndDelete.mockImplementation(() => {
            throw errorObject;
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

        // Verify that the error was actually logged to the console
        expect(consoleSpy).toHaveBeenCalledWith(errorObject);

        // Cleanup: Restore console.log to its original state
        consoleSpy.mockRestore();
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
        // 1. Arrange: Mock the product object with save method
        const mockProduct = {
            _id: 'product123',
            name: 'Updated Laptop',
            photo: {},
            save: jest.fn().mockResolvedValue(true)
        };

        productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
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
                message: "Product Updated Successfully",
                products: mockProduct
            })
        );
    });

    test('should successfully update a product without photo', async () => {
        // 1. Arrange
        req.files.photo = null; // No photo provided

        const mockProduct = {
            _id: 'product123',
            name: 'Updated Laptop',
            save: jest.fn().mockResolvedValue(true)
        };

        productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(fs.readFileSync).not.toHaveBeenCalled();
        expect(mockProduct.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);

        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Product Updated Successfully",
                products: mockProduct
            })
        );
    });

    test('should return 500 if name is missing', async () => {
        // 1. Arrange
        req.fields.name = "";

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    test('should return 500 if description is missing', async () => {
        // 1. Arrange
        req.fields.description = "";

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
    });

    test('should return 500 if price is missing', async () => {
        // 1. Arrange
        req.fields.price = "";

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
    });

    test('should return 500 if category is missing', async () => {
        // 1. Arrange
        req.fields.category = "";

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
    });

    test('should return 500 if quantity is missing', async () => {
        // 1. Arrange
        req.fields.quantity = "";

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
    });

    test('should return 500 if photo size is greater than 1MB', async () => {
        // 1. Arrange
        req.files.photo.size = 2000000; // 2MB

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: "Photo is Required and should be less than 1mb"
        });
    });

    test('should handle internal errors and return 500', async () => {
        // 1. Arrange: Create a specific error to check consistency
        const mockError = new Error('Database Error');
        productModel.findByIdAndUpdate.mockRejectedValue(mockError);

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error in updating product",
                error: mockError
            })
        );
    });

    // BVA Tests for updateProductController
    test('should return 500 if price is negative', async () => {
        // 1. Arrange
        req.fields.price = -10;

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Price must be non-negative" });
    });

    test('should return 500 if quantity is negative', async () => {
        // 1. Arrange
        req.fields.quantity = -5;

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Quantity must be non-negative" });
    });

    test('should allow quantity 0', async () => {
        // 1. Arrange
        req.fields.quantity = 0;
        const mockProduct = {
            _id: 'product123',
            name: 'Updated Laptop',
            photo: {}, // Added photo object for the test
            save: jest.fn().mockResolvedValue(true)
        };
        productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should return 500 if photo size is greater than 1MB', async () => {
        // 1. Arrange
        req.files.photo.size = 1000001;

        // 2. Act
        await updateProductController(req, res);

        // 3. Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: "Photo is Required and should be less than 1mb"
        });
    });
});

describe("Payment Controller Unit Tests", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { user: { _id: "123" }, body: {}, params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
            set: jest.fn(),
        };
    });

    describe("getProductController", () => {
        it("should return all products on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            const mockProducts = [{ _id: "1", name: "Product 1" }];
            productModel.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockProducts),
            });

            // ACT
            await getProductController(req, res);

            // ASSERT
            expect(productModel.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                countTotal: mockProducts.length,
                message: "All Products",
                products: mockProducts,
            });
        });

        it("should send 500 on error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            productModel.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockRejectedValue(new Error("DB error")),
            });

            // ACT
            await getProductController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error in getting products",
                error: "DB error",
            });
        });
    });

    describe("getSingleProductController", () => {
        it("should return single product on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.slug = "test-product";
            const mockProduct = { _id: "1", name: "Test", slug: "test-product" };
            productModel.findOne.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockResolvedValue(mockProduct),
            });

            // ACT
            await getSingleProductController(req, res);

            // ASSERT
            expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Single Product Fetched",
                product: mockProduct,
            });
        });

        it("should send 500 on error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.slug = "test-product";
            productModel.findOne.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockRejectedValue(new Error("DB error")),
            });

            // ACT
            await getSingleProductController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error while getting single product",
                error: expect.any(Error),
            });
        });
    });

    describe("productPhotoController", () => {
        it("should send photo data on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.pid = "pid1";
            const photoData = Buffer.from("x");
            productModel.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    photo: { data: photoData, contentType: "image/png" },
                }),
            });

            // ACT
            await productPhotoController(req, res);

            // ASSERT
            expect(productModel.findById).toHaveBeenCalledWith("pid1");
            expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(photoData);
        });

        it("should not send data if photo.data is missing", async () => {
            // ARRANGE
            req.params.pid = "pid1";
            productModel.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    photo: { contentType: "image/png" }, // No data property
                }),
            });

            // ACT
            await productPhotoController(req, res);

            // ASSERT
            expect(productModel.findById).toHaveBeenCalledWith("pid1");
            expect(res.set).not.toHaveBeenCalled();
            expect(res.send).not.toHaveBeenCalled();
        });

        it("should send 500 on error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.pid = "pid1";
            productModel.findById.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error("DB error")),
            });

            // ACT
            await productPhotoController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error while getting photo",
                error: expect.any(Error),
            });
        });
    });

    describe("deleteProductController", () => {
        it("should delete product and send 200 on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.pid = "pid1";
            productModel.findByIdAndDelete.mockReturnValue({
                select: jest.fn().mockResolvedValue({}),
            });

            // ACT
            await deleteProductController(req, res);

            // ASSERT
            expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("pid1");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Product Deleted successfully",
            });
        });

        it("should send 500 on error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.pid = "pid1";
            productModel.findByIdAndDelete.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error("DB error")),
            });

            // ACT
            await deleteProductController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error while deleting product",
                error: expect.any(Error),
            });
        });
    });

    describe("productFiltersController", () => {
        it("should return filtered products on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.body = { checked: ["cat1"], radio: [0, 100] };
            const mockProducts = [{ _id: "1", name: "P1" }];
            productModel.find.mockResolvedValue(mockProducts);

            // ACT
            await productFiltersController(req, res);

            // ASSERT
            expect(productModel.find).toHaveBeenCalledWith({
                category: ["cat1"],
                price: { $gte: 0, $lte: 100 },
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                products: mockProducts,
            });
        });

        it("should send 400 on error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.body = { checked: [], radio: [] };
            productModel.find.mockRejectedValue(new Error("Filter error"));

            // ACT
            await productFiltersController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Filtering Products",
                error: expect.any(Error),
            });
        });
    });

    describe("productCountController", () => {
        it("should return total count on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            productModel.find.mockReturnValue({
                estimatedDocumentCount: jest.fn().mockResolvedValue(42),
            });

            // ACT
            await productCountController(req, res);

            // ASSERT
            expect(productModel.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                total: 42,
            });
        });

        it("should send 400 on error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            productModel.find.mockReturnValue({
                estimatedDocumentCount: jest.fn().mockRejectedValue(new Error("Count error")),
            });

            // ACT
            await productCountController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                message: "Error in product count",
                error: expect.any(Error),
                success: false,
            });
        });
    });

    describe("productListController", () => {
        it("should return paginated products on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.page = 2;
            const mockProducts = [{ _id: "1", name: "P1" }];
            productModel.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockProducts),
            });

            // ACT
            await productListController(req, res);

            // ASSERT
            expect(productModel.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                products: mockProducts,
            });
        });

        it("should return paginated products on success without page param", async () => {
            // ARRANGE
            req.params.page = undefined; // Trigger fallback to page 1
            const mockProducts = [{ _id: "2", name: "P2" }];
            productModel.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockProducts),
            });

            // ACT
            await productListController(req, res);

            // ASSERT
            expect(productModel.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                products: mockProducts,
            });
        });

        it("should send 400 on error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.page = 1;
            productModel.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockRejectedValue(new Error("List error")),
            });

            // ACT
            await productListController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "error in per page ctrl",
                error: expect.any(Error),
            });
        });
    });

    describe("searchProductController", () => {
        it("should return search results on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.keyword = "laptop";
            const mockResults = [{ _id: "1", name: "Laptop" }];
            productModel.find.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockResults),
            });

            // ACT
            await searchProductController(req, res);

            // ASSERT
            expect(productModel.find).toHaveBeenCalledWith({
                $or: [
                    { name: { $regex: "laptop", $options: "i" } },
                    { description: { $regex: "laptop", $options: "i" } },
                ],
            });
            expect(res.json).toHaveBeenCalledWith(mockResults);
        });

        it("should send 400 on error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.keyword = "x";
            productModel.find.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error("Search error")),
            });

            // ACT
            await searchProductController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error In Search Product API",
                error: expect.any(Error),
            });
        });
    });

    describe("relatedProductController", () => {
        it("should return related products on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params = { pid: "p1", cid: "c1" };
            const mockProducts = [{ _id: "2", name: "Related" }];
            productModel.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockResolvedValue(mockProducts),
            });

            // ACT
            await relatedProductController(req, res);

            // ASSERT
            expect(productModel.find).toHaveBeenCalledWith({
                category: "c1",
                _id: { $ne: "p1" },
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                products: mockProducts,
            });
        });

        it("should send 400 on error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params = { pid: "p1", cid: "c1" };
            productModel.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockRejectedValue(new Error("Related error")),
            });

            // ACT
            await relatedProductController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "error while getting related product",
                error: expect.any(Error),
            });
        });
    });

    describe("productCategoryController", () => {
        it("should return category and products on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.slug = "electronics";
            const mockCategory = { _id: "c1", name: "Electronics", slug: "electronics" };
            const mockProducts = [{ _id: "1", name: "P1" }];
            categoryModel.findOne.mockResolvedValue(mockCategory);
            productModel.find.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockProducts),
            });

            // ACT
            await productCategoryController(req, res);

            // ASSERT
            expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
            expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                category: mockCategory,
                products: mockProducts,
            });
        });

        it("should send 400 on error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.slug = "electronics";
            categoryModel.findOne.mockRejectedValue(new Error("Category error"));

            // ACT
            await productCategoryController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: expect.any(Error),
                message: "Error While Getting products",
            });
        });
    });

    describe("createProductController", () => {
        it("should create product and send 201 on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            const mockSave = jest.fn().mockResolvedValue({ _id: "1", name: "Test" });
            productModel.mockImplementation(function (data) {
                return { save: mockSave };
            });
            req.fields = {
                name: "Test Product",
                description: "Desc",
                price: 99,
                category: "cat1",
                quantity: 10,
                shipping: true,
            };
            req.files = {};
            slugify.mockReturnValue("test-product");

            // ACT
            await createProductController(req, res);

            // ASSERT
            expect(productModel).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Test Product",
                    slug: "test-product",
                })
            );
            expect(mockSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Product Created Successfully",
                products: expect.any(Object),
            });
        });

        it("should send 400 when name is missing", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.fields = { description: "D", price: 1, category: "c", quantity: 1, shipping: false };
            req.files = {};

            // ACT
            await createProductController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
        });

        it("should send 500 on save error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            const mockSave = jest.fn().mockRejectedValue(new Error("Save failed"));
            productModel.mockImplementation(function () {
                return { save: mockSave };
            });
            req.fields = {
                name: "Test",
                description: "D",
                price: 1,
                category: "c",
                quantity: 1,
                shipping: false,
            };
            req.files = {};

            // ACT
            await createProductController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: expect.any(Error),
                message: "Error in creating product",
            });
        });
    });

    describe("updateProductController", () => {
        it("should update product and send 201 on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            const mockSave = jest.fn().mockResolvedValue(undefined);
            const updatedProduct = { _id: "p1", name: "Updated", save: mockSave };
            productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);
            req.params.pid = "p1";
            req.fields = {
                name: "Updated",
                description: "D",
                price: 50,
                category: "c",
                quantity: 5,
                shipping: false,
            };
            req.files = {};
            slugify.mockReturnValue("updated");

            // ACT
            await updateProductController(req, res);

            // ASSERT
            expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "p1",
                expect.objectContaining({ name: "Updated", slug: "updated" }),
                { new: true }
            );
            expect(mockSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Product Updated Successfully",
                products: updatedProduct,
            });
        });

        it("should send 500 when name is missing", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            req.params.pid = "p1";
            req.fields = { description: "D", price: 1, category: "c", quantity: 1, shipping: false };
            req.files = {};

            // ACT
            await updateProductController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
        });

        it("should send 500 on update error", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            productModel.findByIdAndUpdate.mockRejectedValue(new Error("Update failed"));
            req.params.pid = "p1";
            req.fields = {
                name: "X",
                description: "D",
                price: 1,
                category: "c",
                quantity: 1,
                shipping: false,
            };
            req.files = {};

            // ACT
            await updateProductController(req, res);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: expect.any(Error),
                message: "Error in updating product",
            });
        });
    });

    describe("braintreeTokenController", () => {
        it("should send client token on success", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            const fakeResponse = { clientToken: "fake-token-123" };
            mockGenerate.mockImplementation((opts, callback) =>
                callback(null, fakeResponse)
            );

            // ACT
            await braintreeTokenController(req, res);
            await new Promise(setImmediate);

            // ASSERT
            expect(mockGenerate).toHaveBeenCalled();
            expect(res.send).toHaveBeenCalledWith(fakeResponse);
        });

        it("should send 500 error on failure", async () => {
            // Lum Yi Ren Johannsen, A0273503L
            // ARRANGE
            const fakeError = new Error("Braintree Error");
            mockGenerate.mockImplementation((opts, callback) =>
                callback(fakeError, null)
            );

            // ACT
            await braintreeTokenController(req, res);
            await new Promise(setImmediate);

            // ASSERT
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(fakeError);
        });

        it("should trigger catch block if try block throws", async () => {
            // ARRANGE
            const fakeError = new Error("Sync Error");
            mockGenerate.mockImplementation(() => { throw fakeError; });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            // ACT
            await braintreeTokenController(req, res);

            // ASSERT
            expect(consoleSpy).toHaveBeenCalledWith(fakeError);
            consoleSpy.mockRestore();
        });
    });

    describe("Product Controller - Payment", () => {
        let req, res;

        beforeEach(() => {
            jest.clearAllMocks();
            req = { user: { _id: "123" }, body: {} };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                json: jest.fn(),
            };
        });

        describe("braintreeTokenController", () => {
            it("should send a client token when gateway generation succeeds", async () => {
                // Lum Yi Ren Johannsen, A0273503L
                // ARRANGE
                const fakeTokenResponse = { clientToken: "fake-token-123" };
                mockGenerate.mockImplementation((opts, callback) => {
                    callback(null, fakeTokenResponse);
                });

                // ACT
                await braintreeTokenController(req, res);

                // ASSERT
                expect(mockGenerate).toHaveBeenCalled();
                expect(res.send).toHaveBeenCalledWith(fakeTokenResponse);
            });

            it("should return 500 error when gateway generation fails", async () => {
                // Lum Yi Ren Johannsen, A0273503L
                // ARRANGE
                const fakeError = new Error("API Connection Error");
                mockGenerate.mockImplementation((opts, callback) => {
                    callback(fakeError, null);
                });

                // ACT
                await braintreeTokenController(req, res);

                // ASSERT
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(fakeError);
            });
        });

        describe("brainTreePaymentController", () => {
            it("should process payment successfully", async () => {
                // Lum Yi Ren Johannsen, A0273503L
                // ARRANGE
                req.body = {
                    nonce: "fake-nonce",
                    cart: [{ price: 10 }, { price: 20 }],
                };
                const fakeResult = { success: true };
                mockSale.mockImplementation((opts, callback) =>
                    callback(null, fakeResult)
                );

                // ACT
                await brainTreePaymentController(req, res);
                await new Promise(setImmediate);

                // ASSERT
                expect(mockSale).toHaveBeenCalledWith(
                    expect.objectContaining({
                        amount: 30,
                        paymentMethodNonce: "fake-nonce",
                        options: { submitForSettlement: true },
                    }),
                    expect.any(Function)
                );
                expect(res.json).toHaveBeenCalledWith({ ok: true });
            });

            it("should handle payment failure", async () => {
                // Lum Yi Ren Johannsen, A0273503L
                // ARRANGE
                req.body = { nonce: "invalid-nonce", cart: [] };
                const fakeError = new Error("Payment Failed");
                mockSale.mockImplementation((opts, callback) =>
                    callback(fakeError, null)
                );

                // ACT
                await brainTreePaymentController(req, res);
                await new Promise(setImmediate);

                // ASSERT
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith(fakeError);
            });

            it("should trigger catch block if try block throws", async () => {
                // ARRANGE
                req.body = { nonce: "valid-nonce" }; // cart is undefined
                const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

                // ACT
                await brainTreePaymentController(req, res);

                // ASSERT
                expect(consoleSpy).toHaveBeenCalled();
                consoleSpy.mockRestore();
            });
        });
    });
});

describe("Product Controller - Core Product APIs", () => {
    // Basil Boh, A0273232M
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
            set: jest.fn(),
        };
    });

    describe("getProductController", () => {
        it("returns products on success", async () => {
            // Basil Boh, A0273232M
            const mockProducts = [{ _id: "1", name: "P1" }];
            const chain = {
                populate: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockProducts),
            };
            productModel.find.mockReturnValue(chain);

            await getProductController(req, res);

            expect(productModel.find).toHaveBeenCalledWith({});
            expect(chain.populate).toHaveBeenCalledWith("category");
            expect(chain.select).toHaveBeenCalledWith("-photo");
            expect(chain.limit).toHaveBeenCalledWith(12);
            expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("returns 500 on query failure", async () => {
            // Basil Boh, A0273232M
            const chain = {
                populate: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockRejectedValue(new Error("DB error")),
            };
            productModel.find.mockReturnValue(chain);

            await getProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error in getting products",
                error: "DB error",
            });
        });
    });

    describe("getSingleProductController", () => {
        it("returns a single product on success", async () => {
            // Basil Boh, A0273232M
            req.params.slug = "test-product";
            const mockProduct = { _id: "1", slug: "test-product" };
            const chain = {
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockResolvedValue(mockProduct),
            };
            productModel.findOne.mockReturnValue(chain);

            await getSingleProductController(req, res);

            expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
            expect(chain.select).toHaveBeenCalledWith("-photo");
            expect(chain.populate).toHaveBeenCalledWith("category");
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("returns 500 when lookup fails", async () => {
            // Basil Boh, A0273232M
            req.params.slug = "test-product";
            const chain = {
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockRejectedValue(new Error("DB error")),
            };
            productModel.findOne.mockReturnValue(chain);

            await getSingleProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error while getting single product",
                error: expect.any(Error),
            });
        });
    });

    describe("productPhotoController", () => {
        it("returns photo bytes when photo exists", async () => {
            // Basil Boh, A0273232M
            req.params.pid = "p1";
            const photoData = Buffer.from("image");
            productModel.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    photo: { data: photoData, contentType: "image/png" },
                }),
            });

            await productPhotoController(req, res);

            expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(photoData);
        });

        it("returns 500 when reading photo fails", async () => {
            // Basil Boh, A0273232M
            req.params.pid = "p1";
            productModel.findById.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error("DB error")),
            });

            await productPhotoController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error while getting photo",
                error: expect.any(Error),
            });
        });
    });

    describe("productFiltersController", () => {
        it("applies checked/radio filters and returns products", async () => {
            // Basil Boh, A0273232M
            req.body = { checked: ["cat1"], radio: [0, 100] };
            const mockProducts = [{ _id: "1", name: "P1" }];
            productModel.find.mockResolvedValue(mockProducts);

            await productFiltersController(req, res);

            expect(productModel.find).toHaveBeenCalledWith({
                category: ["cat1"],
                price: { $gte: 0, $lte: 100 },
            });
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("returns 400 when filter query fails", async () => {
            // Basil Boh, A0273232M
            req.body = { checked: [], radio: [] };
            productModel.find.mockRejectedValue(new Error("Filter error"));

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Filtering Products",
                error: expect.any(Error),
            });
        });
    });

    describe("productCountController", () => {
        it("returns total count on success", async () => {
            // Basil Boh, A0273232M
            const estimatedDocumentCount = jest.fn().mockResolvedValue(42);
            productModel.find.mockReturnValue({ estimatedDocumentCount });

            await productCountController(req, res);

            expect(productModel.find).toHaveBeenCalledWith({});
            expect(estimatedDocumentCount).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                total: 42,
            });
        });

        it("returns 400 when count fails", async () => {
            // Basil Boh, A0273232M
            productModel.find.mockReturnValue({
                estimatedDocumentCount: jest.fn().mockRejectedValue(new Error("Count error")),
            });

            await productCountController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                message: "Error in product count",
                error: expect.any(Error),
                success: false,
            });
        });
    });

    describe("productListController", () => {
        it("returns paginated products", async () => {
            // Basil Boh, A0273232M
            req.params.page = 2;
            const mockProducts = [{ _id: "1", name: "P1" }];
            const chain = {
                select: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockProducts),
            };
            productModel.find.mockReturnValue(chain);

            await productListController(req, res);

            expect(chain.select).toHaveBeenCalledWith("-photo");
            expect(chain.skip).toHaveBeenCalledWith(6);
            expect(chain.limit).toHaveBeenCalledWith(6);
            expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("returns 400 when pagination query fails", async () => {
            // Basil Boh, A0273232M
            req.params.page = 1;
            const chain = {
                select: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockRejectedValue(new Error("List error")),
            };
            productModel.find.mockReturnValue(chain);

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "error in per page ctrl",
                error: expect.any(Error),
            });
        });
    });

    describe("searchProductController", () => {
        it("returns results for keyword search", async () => {
            // Basil Boh, A0273232M
            req.params.keyword = "laptop";
            const mockResults = [{ _id: "1", name: "Laptop" }];
            const chain = { select: jest.fn().mockResolvedValue(mockResults) };
            productModel.find.mockReturnValue(chain);

            await searchProductController(req, res);

            expect(productModel.find).toHaveBeenCalledWith({
                $or: [
                    { name: { $regex: "laptop", $options: "i" } },
                    { description: { $regex: "laptop", $options: "i" } },
                ],
            });
            expect(chain.select).toHaveBeenCalledWith("-photo");
            expect(res.json).toHaveBeenCalledWith(mockResults);
        });

        it("returns 400 when search query fails", async () => {
            // Basil Boh, A0273232M
            req.params.keyword = "x";
            productModel.find.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error("Search error")),
            });

            await searchProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error In Search Product API",
                error: expect.any(Error),
            });
        });
    });

    describe("relatedProductController", () => {
        it("returns related products by category excluding pid", async () => {
            // Basil Boh, A0273232M
            req.params = { pid: "p1", cid: "c1" };
            const mockProducts = [{ _id: "2", name: "Related" }];
            const chain = {
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockResolvedValue(mockProducts),
            };
            productModel.find.mockReturnValue(chain);

            await relatedProductController(req, res);

            expect(productModel.find).toHaveBeenCalledWith({
                category: "c1",
                _id: { $ne: "p1" },
            });
            expect(chain.select).toHaveBeenCalledWith("-photo");
            expect(chain.limit).toHaveBeenCalledWith(3);
            expect(chain.populate).toHaveBeenCalledWith("category");
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("returns 400 when related lookup fails", async () => {
            // Basil Boh, A0273232M
            req.params = { pid: "p1", cid: "c1" };
            productModel.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockRejectedValue(new Error("Related error")),
            });

            await relatedProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "error while getting related product",
                error: expect.any(Error),
            });
        });
    });

    describe("productCategoryController", () => {
        it("returns category and products for a valid slug", async () => {
            // Basil Boh, A0273232M
            req.params.slug = "electronics";
            const mockCategory = { _id: "c1", slug: "electronics" };
            const mockProducts = [{ _id: "1", name: "P1" }];
            categoryModel.findOne.mockResolvedValue(mockCategory);
            const populate = jest.fn().mockResolvedValue(mockProducts);
            productModel.find.mockReturnValue({ populate });

            await productCategoryController(req, res);

            expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
            expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
            expect(populate).toHaveBeenCalledWith("category");
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("returns 400 when category lookup fails", async () => {
            // Basil Boh, A0273232M
            req.params.slug = "electronics";
            categoryModel.findOne.mockRejectedValue(new Error("Category error"));

            await productCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: expect.any(Error),
                message: "Error While Getting products",
            });
        });
    });
});
