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

jest.mock("../models/productModel.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

import braintree from "braintree";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import {
  braintreeTokenController,
  brainTreePaymentController,
  getProductController,
  getSingleProductController,
  productPhotoController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  realtedProductController,
  productCategoryController,
} from "./productController.js";

const mockGenerate = braintree.BraintreeGateway._mockGenerate;
const mockSale = braintree.BraintreeGateway._mockSale;

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
    it("should process payment successfully and return result", async () => {
      // Lum Yi Ren Johannsen, A0273503L
      // ARRANGE
      req.body = {
        nonce: "fake-nonce",
        cart: [{ price: 10 }, { price: 20 }],
      };
      const fakeTransactionResult = { success: true, transaction: { id: "tx-123" } };
      mockSale.mockImplementation((opts, callback) => {
        callback(null, fakeTransactionResult);
      });

      // ACT
      await brainTreePaymentController(req, res);

      // ASSERT
      expect(mockSale).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("should return 500 error when transaction fails", async () => {
      // Lum Yi Ren Johannsen, A0273503L
      // ARRANGE
      req.body = { nonce: "invalid-nonce", cart: [] };
      const fakeError = new Error("Payment Declined");
      mockSale.mockImplementation((opts, callback) => {
        callback(fakeError, null);
      });

      // ACT
      await brainTreePaymentController(req, res);

      // ASSERT
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(fakeError);
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
        message: "Erorr in getting products",
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
        message: "Eror while getitng single product",
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
        message: "Erorr while getting photo",
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
        message: "Error WHile Filtering Products",
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

  describe("realtedProductController", () => {
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

      await realtedProductController(req, res);

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

      await realtedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "error while geting related product",
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
