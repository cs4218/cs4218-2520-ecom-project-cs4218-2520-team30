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

jest.mock("../models/orderModel.js", () => {
  const mockSave = jest.fn().mockResolvedValue(undefined);
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(function () {
      return { save: mockSave };
    }),
  };
});

jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");
jest.mock("fs");
jest.mock("slugify");

import braintree from "braintree";
import fs from "fs";
import slugify from "slugify";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import {
  braintreeTokenController,
  brainTreePaymentController,
  getProductController,
  getSingleProductController,
  productPhotoController,
  deleteProductController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  realtedProductController,
  productCategoryController,
  createProductController,
  updateProductController,
} from "./productController.js";

const mockGenerate = braintree.BraintreeGateway._mockGenerate;
const mockSale = braintree.BraintreeGateway._mockSale;

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
        counTotal: mockProducts.length,
        message: "ALlProducts ",
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
        message: "Erorr in getting products",
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
        message: "Eror while getitng single product",
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
        message: "Erorr while getting photo",
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
        message: "Error WHile Filtering Products",
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

  describe("realtedProductController", () => {
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
      await realtedProductController(req, res);

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
      await realtedProductController(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "error while geting related product",
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

    it("should send 500 when name is missing", async () => {
      // Lum Yi Ren Johannsen, A0273503L
      // ARRANGE
      req.fields = { description: "D", price: 1, category: "c", quantity: 1, shipping: false };
      req.files = {};

      // ACT
      await createProductController(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
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
        message: "Error in crearing product",
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
        message: "Error in Updte product",
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
  });
});
