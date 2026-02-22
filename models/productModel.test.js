import mongoose from "mongoose";
import productModel from "./productModel.js";

describe("Product Model Unit Tests", () => {
  it("should validate successfully with all required fields", () => {
    // Basil Boh, A0273232M
    // ARRANGE
    const validProduct = new productModel({
      name: "Laptop",
      slug: "laptop",
      description: "Thin and light laptop",
      price: 1299,
      category: new mongoose.Types.ObjectId(),
      quantity: 8,
      shipping: true,
      photo: {
        data: Buffer.from("image-bytes"),
        contentType: "image/png",
      },
    });

    // ACT
    const err = validProduct.validateSync();

    // ASSERT
    expect(err).toBeUndefined();
  });

  it("should fail validation when name is missing", () => {
    // Basil Boh, A0273232M
    const invalidProduct = new productModel({
      slug: "laptop",
      description: "desc",
      price: 100,
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
    });

    const err = invalidProduct.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
  });

  it("should fail validation when slug is missing", () => {
    // Basil Boh, A0273232M
    const invalidProduct = new productModel({
      name: "Laptop",
      description: "desc",
      price: 100,
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
    });

    const err = invalidProduct.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.slug).toBeDefined();
  });

  it("should fail validation when description is missing", () => {
    // Basil Boh, A0273232M
    const invalidProduct = new productModel({
      name: "Laptop",
      slug: "laptop",
      price: 100,
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
    });

    const err = invalidProduct.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.description).toBeDefined();
  });

  it("should fail validation when price/category/quantity are missing", () => {
    // Basil Boh, A0273232M
    const invalidProduct = new productModel({
      name: "Laptop",
      slug: "laptop",
      description: "desc",
    });

    const err = invalidProduct.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.price).toBeDefined();
    expect(err.errors.category).toBeDefined();
    expect(err.errors.quantity).toBeDefined();
  });

  it("should allow optional fields photo and shipping to be omitted", () => {
    // Basil Boh, A0273232M
    const productWithoutOptionalFields = new productModel({
      name: "Phone",
      slug: "phone",
      description: "Smartphone",
      price: 799,
      category: new mongoose.Types.ObjectId(),
      quantity: 3,
    });

    const err = productWithoutOptionalFields.validateSync();

    expect(err).toBeUndefined();
  });
});
