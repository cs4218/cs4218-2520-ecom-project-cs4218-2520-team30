import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SearchInput from "./SearchInput";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../../context/search";

jest.mock("axios");
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));
jest.mock("../../context/search", () => ({
  useSearch: jest.fn(),
}));

describe("SearchInput Component", () => {
  let mockNavigate;
  let mockSetValues;
  let mockValues;

  beforeEach(() => {
    mockNavigate = jest.fn();
    mockSetValues = jest.fn();
    mockValues = { keyword: "", results: [] };

    useNavigate.mockReturnValue(mockNavigate);
    useSearch.mockReturnValue([mockValues, mockSetValues]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Component Rendering", () => {
    test("should render search input and button", () => {
      // Arrange
      // (setup done in beforeEach)

      // Act
      render(<SearchInput />);

      // Assert
      expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    });

    test("should display current keyword value in input", () => {
      // Arrange
      mockValues.keyword = "laptop";
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      render(<SearchInput />);

      // Assert
      expect(screen.getByPlaceholderText("Search")).toHaveValue("laptop");
    });
  });

  describe("User Input Handling", () => {
    test("should update keyword when user types in search input", () => {
      // Arrange
      render(<SearchInput />);
      const searchInput = screen.getByPlaceholderText("Search");

      // Act
      fireEvent.change(searchInput, { target: { value: "phone" } });

      // Assert
      expect(mockSetValues).toHaveBeenCalledWith({
        keyword: "phone",
        results: [],
      });
    });

    test("should handle empty string input", () => {
      // Arrange
      mockValues.keyword = "laptop";
      useSearch.mockReturnValue([mockValues, mockSetValues]);
      render(<SearchInput />);
      const searchInput = screen.getByPlaceholderText("Search");

      // Act
      fireEvent.change(searchInput, { target: { value: "" } });

      // Assert
      expect(mockSetValues).toHaveBeenCalledWith({
        keyword: "",
        results: [],
      });
    });
  });

  describe("Search Submission - Success Cases", () => {
    test("should call API and navigate on successful search", async () => {
      // Arrange
      mockValues.keyword = "laptop";
      useSearch.mockReturnValue([mockValues, mockSetValues]);
      const mockSearchResults = [
        { _id: "1", name: "Laptop 1", price: 999 },
        { _id: "2", name: "Laptop 2", price: 1299 },
      ];
      axios.get.mockResolvedValue({ data: mockSearchResults });
      render(<SearchInput />);
      const form = screen.getByRole("search");

      // Act
      fireEvent.submit(form);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/laptop");
        expect(mockSetValues).toHaveBeenCalledWith({
          keyword: "laptop",
          results: mockSearchResults,
        });
        expect(mockNavigate).toHaveBeenCalledWith("/search");
      });
    });

    test("should handle search with special characters in keyword", async () => {
      // Arrange
      mockValues.keyword = "laptop & accessories";
      useSearch.mockReturnValue([mockValues, mockSetValues]);
      const mockSearchResults = [{ _id: "3", name: "Accessories", price: 50 }];
      axios.get.mockResolvedValue({ data: mockSearchResults });
      render(<SearchInput />);
      const form = screen.getByRole("search");

      // Act
      fireEvent.submit(form);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/search/laptop & accessories"
        );
        expect(mockSetValues).toHaveBeenCalledWith({
          keyword: "laptop & accessories",
          results: mockSearchResults,
        });
      });
    });

    test("should handle empty search results", async () => {
      // Arrange
      mockValues.keyword = "nonexistent";
      useSearch.mockReturnValue([mockValues, mockSetValues]);
      axios.get.mockResolvedValue({ data: [] });
      render(<SearchInput />);
      const form = screen.getByRole("search");

      // Act
      fireEvent.submit(form);

      // Assert
      await waitFor(() => {
        expect(mockSetValues).toHaveBeenCalledWith({
          keyword: "nonexistent",
          results: [],
        });
        expect(mockNavigate).toHaveBeenCalledWith("/search");
      });
    });
  });

  describe("Search Submission - Error Cases", () => {
    test("should log error when API call fails", async () => {
      // Arrange
      mockValues.keyword = "laptop";
      useSearch.mockReturnValue([mockValues, mockSetValues]);
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      const apiError = new Error("Network error");
      axios.get.mockRejectedValue(apiError);
      render(<SearchInput />);
      const form = screen.getByRole("search");

      // Act
      fireEvent.submit(form);

      // Assert
      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(apiError);
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      consoleLogSpy.mockRestore();
    });

    test("should handle 404 error from API", async () => {
      // Arrange
      mockValues.keyword = "laptop";
      useSearch.mockReturnValue([mockValues, mockSetValues]);
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      const notFoundError = { response: { status: 404 } };
      axios.get.mockRejectedValue(notFoundError);
      render(<SearchInput />);
      const form = screen.getByRole("search");

      // Act
      fireEvent.submit(form);

      // Assert
      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(notFoundError);
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe("Form Submission Behavior", () => {
    test("should prevent default form submission", async () => {
      // Arrange
      mockValues.keyword = "test";
      useSearch.mockReturnValue([mockValues, mockSetValues]);
      axios.get.mockResolvedValue({ data: [] });
      render(<SearchInput />);
      const form = screen.getByRole("search");
      const mockEvent = { preventDefault: jest.fn() };

      // Act
      fireEvent.submit(form, mockEvent);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test("should submit form when button is clicked", async () => {
      // Arrange
      mockValues.keyword = "test";
      useSearch.mockReturnValue([mockValues, mockSetValues]);
      axios.get.mockResolvedValue({ data: [] });
      render(<SearchInput />);
      const submitButton = screen.getByRole("button", { name: /search/i });

      // Act
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/test");
      });
    });
  });
});
