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
      // Basil Boh, A0273232M
      // ARRANGE
      const mockProducts = [{ _id: "1", name: "Product 1" }];
      const populateMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockResolvedValue(mockProducts);
      productModel.find.mockReturnValue({
        populate: populateMock,
        select: selectMock,
        limit: limitMock,
        sort: sortMock,
      });

      // ACT
      await getProductController(req, res);

      // ASSERT
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(populateMock).toHaveBeenCalledWith("category");
      expect(selectMock).toHaveBeenCalledWith("-photo");
      expect(limitMock).toHaveBeenCalledWith(12);
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        counTotal: mockProducts.length,
        message: "ALlProducts ",
        products: mockProducts,
      });
    });

    it("should send 500 on error", async () => {
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
      // ARRANGE
      req.params.slug = "test-product";
      const mockProduct = { _id: "1", name: "Test", slug: "test-product" };
      const selectMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockResolvedValue(mockProduct);
      productModel.findOne.mockReturnValue({
        select: selectMock,
        populate: populateMock,
      });

      // ACT
      await getSingleProductController(req, res);

      // ASSERT
      expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
      expect(selectMock).toHaveBeenCalledWith("-photo");
      expect(populateMock).toHaveBeenCalledWith("category");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Single Product Fetched",
        product: mockProduct,
      });
    });

    it("should send 500 on error", async () => {
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
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

    it("should not send photo when product has no photo data", async () => {
      // Basil Boh, A0273232M — cover productPhotoController branch when photo.data falsy (line 114)
      req.params.pid = "pid1";
      productModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          photo: { data: null, contentType: "image/png" },
        }),
      });

      await productPhotoController(req, res);

      expect(productModel.findById).toHaveBeenCalledWith("pid1");
      expect(res.set).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(200);
      expect(res.send).not.toHaveBeenCalled();
    });
  });

  describe("deleteProductController", () => {
    it("should delete product and send 200 on success", async () => {
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
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

    it("should return all products when no filters are selected", async () => {
      // Basil Boh, A0273232M
      // ARRANGE
      req.body = { checked: [], radio: [] };
      const mockProducts = [{ _id: "1", name: "Unfiltered Product" }];
      productModel.find.mockResolvedValue(mockProducts);

      // ACT
      await productFiltersController(req, res);

      // ASSERT
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });
  });

  describe("productCountController", () => {
    it("should return total count on success", async () => {
      // Basil Boh, A0273232M
      // ARRANGE
      const estimatedDocumentCountMock = jest.fn().mockResolvedValue(42);
      productModel.find.mockReturnValue({
        estimatedDocumentCount: estimatedDocumentCountMock,
      });

      // ACT
      await productCountController(req, res);

      // ASSERT
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(estimatedDocumentCountMock).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        total: 42,
      });
    });

    it("should send 400 on error", async () => {
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
      // ARRANGE
      req.params.page = 2;
      const mockProducts = [{ _id: "1", name: "P1" }];
      const selectMock = jest.fn().mockReturnThis();
      const skipMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockResolvedValue(mockProducts);
      productModel.find.mockReturnValue({
        select: selectMock,
        skip: skipMock,
        limit: limitMock,
        sort: sortMock,
      });

      // ACT
      await productListController(req, res);

      // ASSERT
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(selectMock).toHaveBeenCalledWith("-photo");
      expect(skipMock).toHaveBeenCalledWith(6);
      expect(limitMock).toHaveBeenCalledWith(6);
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it("should send 400 on error", async () => {
      // Basil Boh, A0273232M
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

    it("should use page 1 when req.params.page is missing", async () => {
      // Basil Boh, A0273232M — cover productListController default page branch (line 239)
      req.params = {};
      const mockProducts = [{ _id: "1", name: "P1" }];
      const mockSkip = jest.fn().mockReturnThis();
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: mockSkip,
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      await productListController(req, res);

      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });
  });

  describe("searchProductController", () => {
    it("should return search results on success", async () => {
      // Basil Boh, A0273232M
      // ARRANGE
      req.params.keyword = "laptop";
      const mockResults = [{ _id: "1", name: "Laptop" }];
      const selectMock = jest.fn().mockResolvedValue(mockResults);
      productModel.find.mockReturnValue({
        select: selectMock,
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
      expect(selectMock).toHaveBeenCalledWith("-photo");
      expect(res.json).toHaveBeenCalledWith(mockResults);
    });

    it("should send 400 on error", async () => {
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
      // ARRANGE
      req.params = { pid: "p1", cid: "c1" };
      const mockProducts = [{ _id: "2", name: "Related" }];
      const selectMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockResolvedValue(mockProducts);
      productModel.find.mockReturnValue({
        select: selectMock,
        limit: limitMock,
        populate: populateMock,
      });

      // ACT
      await realtedProductController(req, res);

      // ASSERT
      expect(productModel.find).toHaveBeenCalledWith({
        category: "c1",
        _id: { $ne: "p1" },
      });
      expect(selectMock).toHaveBeenCalledWith("-photo");
      expect(limitMock).toHaveBeenCalledWith(3);
      expect(populateMock).toHaveBeenCalledWith("category");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it("should send 400 on error", async () => {
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
      // ARRANGE
      req.params.slug = "electronics";
      const mockCategory = { _id: "c1", name: "Electronics", slug: "electronics" };
      const mockProducts = [{ _id: "1", name: "P1" }];
      const populateMock = jest.fn().mockResolvedValue(mockProducts);
      categoryModel.findOne.mockResolvedValue(mockCategory);
      productModel.find.mockReturnValue({
        populate: populateMock,
      });

      // ACT
      await productCategoryController(req, res);

      // ASSERT
      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
      expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
      expect(populateMock).toHaveBeenCalledWith("category");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        category: mockCategory,
        products: mockProducts,
      });
    });

    it("should send 400 on error", async () => {
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
      // ARRANGE
      req.fields = { description: "D", price: 1, category: "c", quantity: 1, shipping: false };
      req.files = {};

      // ACT
      await createProductController(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    it("should send 500 when description is missing", async () => {
      // Basil Boh, A0273232M — cover createProductController validation (line 30)
      req.fields = { name: "X", price: 1, category: "c", quantity: 1, shipping: false };
      req.files = {};
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
    });

    it("should send 500 when price is missing", async () => {
      // Basil Boh, A0273232M — cover createProductController validation (line 32)
      req.fields = { name: "X", description: "D", category: "c", quantity: 1, shipping: false };
      req.files = {};
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
    });

    it("should send 500 when category is missing", async () => {
      // Basil Boh, A0273232M — cover createProductController validation (line 34)
      req.fields = { name: "X", description: "D", price: 1, quantity: 1, shipping: false };
      req.files = {};
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
    });

    it("should send 500 when quantity is missing", async () => {
      // Basil Boh, A0273232M — cover createProductController validation (line 36)
      req.fields = { name: "X", description: "D", price: 1, category: "c", shipping: false };
      req.files = {};
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
    });

    it("should send 500 when photo size exceeds 1mb", async () => {
      // Basil Boh, A0273232M — cover createProductController validation (lines 36–39)
      req.fields = {
        name: "X",
        description: "D",
        price: 1,
        category: "c",
        quantity: 1,
        shipping: false,
      };
      req.files = { photo: { path: "/tmp/p", type: "image/jpeg", size: 1000001 } };
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: "photo is Required and should be less then 1mb",
      });
    });

    it("should create product with photo and send 201", async () => {
      // Basil Boh, A0273232M — cover createProductController photo branch (lines 45–46)
      const mockSave = jest.fn().mockResolvedValue({ _id: "1", name: "Test" });
      productModel.mockImplementation(function () {
        return { photo: { data: null, contentType: null }, save: mockSave };
      });
      fs.readFileSync.mockReturnValue(Buffer.from("imagedata"));
      req.fields = {
        name: "Test Product",
        description: "Desc",
        price: 99,
        category: "cat1",
        quantity: 10,
        shipping: true,
      };
      req.files = { photo: { path: "/tmp/photo.jpg", type: "image/jpeg", size: 500 } };
      slugify.mockReturnValue("test-product");

      await createProductController(req, res);

      expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/photo.jpg");
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Created Successfully",
        products: expect.any(Object),
      });
    });

    it("should send 500 on save error", async () => {
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
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

    it("should send 500 when description is missing", async () => {
      // Basil Boh, A0273232M — cover updateProductController validation (line 156)
      req.params.pid = "p1";
      req.fields = { name: "X", price: 1, category: "c", quantity: 1, shipping: false };
      req.files = {};
      await updateProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
    });

    it("should send 500 when price is missing", async () => {
      // Basil Boh, A0273232M — cover updateProductController validation (line 158)
      req.params.pid = "p1";
      req.fields = { name: "X", description: "D", category: "c", quantity: 1, shipping: false };
      req.files = {};
      await updateProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
    });

    it("should send 500 when category is missing", async () => {
      // Basil Boh, A0273232M — cover updateProductController validation (line 160)
      req.params.pid = "p1";
      req.fields = { name: "X", description: "D", price: 1, quantity: 1, shipping: false };
      req.files = {};
      await updateProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
    });

    it("should send 500 when quantity is missing", async () => {
      // Basil Boh, A0273232M — cover updateProductController validation (line 162)
      req.params.pid = "p1";
      req.fields = { name: "X", description: "D", price: 1, category: "c", shipping: false };
      req.files = {};
      await updateProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
    });

    it("should send 500 when photo size exceeds 1mb", async () => {
      // Basil Boh, A0273232M — cover updateProductController validation (lines 164–166)
      req.params.pid = "p1";
      req.fields = {
        name: "X",
        description: "D",
        price: 1,
        category: "c",
        quantity: 1,
        shipping: false,
      };
      req.files = { photo: { path: "/tmp/p", type: "image/jpeg", size: 1000001 } };
      await updateProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: "photo is Required and should be less then 1mb",
      });
    });

    it("should send 500 on update error", async () => {
      // Basil Boh, A0273232M
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

    it("should update product with photo and send 201", async () => {
      // Basil Boh, A0273232M — cover updateProductController photo branch (lines 175–177)
      // ARRANGE
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const photoPath = "/tmp/photo.jpg";
      const updatedProduct = {
        _id: "p1",
        name: "Updated",
        photo: { data: null, contentType: null },
        save: mockSave,
      };
      productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);
      fs.readFileSync.mockReturnValue(Buffer.from("imagedata"));
      req.params.pid = "p1";
      req.fields = {
        name: "Updated",
        description: "D",
        price: 50,
        category: "c",
        quantity: 5,
        shipping: false,
      };
      req.files = { photo: { path: photoPath, type: "image/jpeg", size: 500 } };
      slugify.mockReturnValue("updated");

      // ACT
      await updateProductController(req, res);

      // ASSERT
      expect(fs.readFileSync).toHaveBeenCalledWith(photoPath);
      expect(updatedProduct.photo.data).toEqual(Buffer.from("imagedata"));
      expect(updatedProduct.photo.contentType).toBe("image/jpeg");
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Updated Successfully",
        products: updatedProduct,
      });
    });
  });

  describe("braintreeTokenController", () => {
    it("should send client token on success", async () => {
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
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

    it("should handle when clientToken.generate throws (catch block)", async () => {
      // Basil Boh, A0273232M — cover braintreeTokenController catch (line 341)
      // ARRANGE
      mockGenerate.mockImplementation(() => {
        throw new Error("generate threw");
      });

      // ACT
      await braintreeTokenController(req, res);

      // ASSERT — catch only console.logs, does not send
      expect(mockGenerate).toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });
  });

  describe("brainTreePaymentController", () => {
    it("should process payment successfully", async () => {
      // Basil Boh, A0273232M
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
      // Basil Boh, A0273232M
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

    it("should handle when cart is missing (catch block)", async () => {
      // Basil Boh, A0273232M — cover brainTreePaymentController catch (line 375)
      // ARRANGE — no cart so cart.map throws
      req.body = { nonce: "x" };

      // ACT
      await brainTreePaymentController(req, res);

      // ASSERT — catch only console.logs, does not send
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
