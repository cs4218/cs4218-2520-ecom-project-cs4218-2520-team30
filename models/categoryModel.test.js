import categoryModel from "./categoryModel.js";

describe("Category Model Unit Tests", () => {

  it("should validate successfully with a valid name and slug", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const validCategory = new categoryModel({
      name: "Electronics",
      slug: "electronics"
    });

    // ACT
    // validateSync() checks the schema rules synchronously without needing a DB connection
    const err = validCategory.validateSync();

    // ASSERT
    expect(err).toBeUndefined();
  });

  it("should throw a validation error if 'name' is missing", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const invalidCategory = new categoryModel({
      slug: "no-name-category"
    });

    // ACT
    const err = invalidCategory.validateSync();

    // ASSERT
    // We expect an error because the schema requires a 'name'
    expect(err).toBeDefined();
    expect(err.errors["name"]).toBeDefined();
  });
});
