import mongoose from "mongoose";
import connectDB from "./db.js";

jest.mock("mongoose");

describe("Database Configuration", () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should connect to the database successfully", async () => {
    // ARRANGE
    mongoose.connect.mockResolvedValueOnce({
      connection: { host: "localhost" },
    });

    // ACT
    await connectDB();

    // ASSERT
    expect(mongoose.connect).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Connected To Mongodb Database")
    );
  });

  it("should handle connection errors gracefully", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockError = new Error("Connection failed");
    mongoose.connect.mockRejectedValueOnce(mockError);

    // ACT
    await connectDB();

    // ASSERT
    expect(mongoose.connect).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error in Mongodb")
    );
  });
});
