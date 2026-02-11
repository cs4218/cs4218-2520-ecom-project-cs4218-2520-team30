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

//Tay Kai Jun, A0283343E
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

  //Tay Kai Jun, A0283343E
  describe("Component Rendering", () => {
    //Tay Kai Jun, A0283343E
    test("should render search input and button", () => {
      // Arrange
      // (setup done in beforeEach)

      // Act
      render(<SearchInput />);

      // Assert
      expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
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

  //Tay Kai Jun, A0283343E
  describe("User Input Handling", () => {

    //Tay Kai Jun, A0283343E
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

    //Tay Kai Jun, A0283343E
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

  //Tay Kai Jun, A0283343E
  describe("Search Submission - Success Cases", () => {

    //Tay Kai Jun, A0283343E
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

    //Tay Kai Jun, A0283343E
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

    //Tay Kai Jun, A0283343E
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

  //Tay Kai Jun, A0283343E
  describe("Search Submission - Error Cases", () => {

    //Tay Kai Jun, A0283343E
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

    //Tay Kai Jun, A0283343E
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

  //Tay Kai Jun, A0283343E
  describe("Form Submission Behavior", () => {
    
    //Tay Kai Jun, A0283343E
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

    //Tay Kai Jun, A0283343E
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
