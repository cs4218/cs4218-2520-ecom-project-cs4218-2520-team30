import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Search from "./Search";
import { useSearch } from "../context/search";
import { BrowserRouter } from "react-router-dom";
//Tay Kai Jun, A0283343E
jest.mock("../context/search", () => ({
  useSearch: jest.fn(),
}));

//Tay Kai Jun, A0283343E
jest.mock("./../components/Layout", () => {
  return function MockLayout({ children, title }) {
    return (
      <div data-testid="layout" data-title={title}>
        {children}
      </div>
    );
  };
});

//Tay Kai Jun, A0283343E
describe("Search Page Component", () => {
  let mockSetValues;

  beforeEach(() => {
    mockSetValues = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  //Tay Kai Jun, A0283343E
  describe("No Results State", () => {
    //Tay Kai Jun, A0283343E
    test("should display 'No Products Found' when results array is empty", () => {
      // Arrange
      const mockValues = { keyword: "laptop", results: [] };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByText("Search Resuts")).toBeInTheDocument();
      expect(screen.getByText("No Products Found")).toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
    test("should display 'No Products Found' when results is null", () => {
      // Arrange
      const mockValues = { keyword: "test", results: null };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByText("No Products Found")).toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
    test("should render Layout with correct title", () => {
      // Arrange
      const mockValues = { keyword: "", results: [] };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByTestId("layout")).toHaveAttribute(
        "data-title",
        "Search results"
      );
    });
  });

  //Tay Kai Jun, A0283343E
  describe("Results Display", () => {

    //Tay Kai Jun, A0283343E
    test("should display correct count when products are found", () => {
      // Arrange
      const mockProducts = [
        {
          _id: "1",
          name: "Laptop",
          description: "High performance laptop for gaming",
          price: 999,
        },
        {
          _id: "2",
          name: "Phone",
          description: "Latest smartphone with advanced features",
          price: 699,
        },
      ];
      const mockValues = { keyword: "electronics", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByText("Found 2")).toBeInTheDocument();
      expect(screen.queryByText("No Products Found")).not.toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
    test("should render all product cards with correct data", () => {
      // Arrange
      const mockProducts = [
        {
          _id: "1",
          name: "Laptop",
          description: "High performance laptop for gaming",
          price: 999,
        },
        {
          _id: "2",
          name: "Phone",
          description: "Latest smartphone with advanced features",
          price: 699,
        },
      ];
      const mockValues = { keyword: "test", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
      expect(screen.getByText("High performance laptop for ga...")).toBeInTheDocument();
      expect(screen.getByText("Latest smartphone with advance...")).toBeInTheDocument();
      expect(screen.getByText("$ 999")).toBeInTheDocument();
      expect(screen.getByText("$ 699")).toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
    test("should display single product correctly", () => {
      // Arrange
      const mockProducts = [
        {
          _id: "1",
          name: "Tablet",
          description: "Premium tablet for work and play",
          price: 499,
        },
      ];
      const mockValues = { keyword: "tablet", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByText("Found 1")).toBeInTheDocument();
      expect(screen.getByText("Tablet")).toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
    test("should truncate long descriptions to 30 characters", () => {
      // Arrange
      const mockProducts = [
        {
          _id: "1",
          name: "Product",
          description: "This is a very long description that should be truncated after thirty characters",
          price: 100,
        },
      ];
      const mockValues = { keyword: "test", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(
        screen.getByText("This is a very long descriptio...")
      ).toBeInTheDocument();
    });
  });

  //Tay Kai Jun, A0283343E
  describe("Product Card Actions", () => {
    test("should render 'More Details' button for each product", () => {
      // Arrange
      const mockProducts = [
        {
          _id: "1",
          name: "Product A",
          description: "Description A",
          price: 100,
        },
        {
          _id: "2",
          name: "Product B",
          description: "Description B",
          price: 200,
        },
      ];
      const mockValues = { keyword: "test", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      const moreDetailsButtons = screen.getAllByText("More Details");
      expect(moreDetailsButtons).toHaveLength(2);
    });

    test("should render 'ADD TO CART' button for each product", () => {
      // Arrange
      const mockProducts = [
        {
          _id: "1",
          name: "Product A",
          description: "Description A",
          price: 100,
        },
      ];
      const mockValues = { keyword: "test", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByText("ADD TO CART")).toBeInTheDocument();
    });
  });

  //Tay Kai Jun, A0283343E
  describe("Product Images", () => {

    //Tay Kai Jun, A0283343E
    test("should render product images with correct src and alt attributes", () => {
      // Arrange
      const mockProducts = [
        {
          _id: "product123",
          name: "Laptop Pro",
          description: "Professional laptop",
          price: 1500,
        },
      ];
      const mockValues = { keyword: "laptop", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      const image = screen.getByAltText("Laptop Pro");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/product123"
      );
    });

    //Tay Kai Jun, A0283343E
    test("should render images for all products", () => {
      // Arrange
      const mockProducts = [
        {
          _id: "1",
          name: "Product 1",
          description: "Description 1",
          price: 100,
        },
        {
          _id: "2",
          name: "Product 2",
          description: "Description 2",
          price: 200,
        },
        {
          _id: "3",
          name: "Product 3",
          description: "Description 3",
          price: 300,
        },
      ];
      const mockValues = { keyword: "test", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByAltText("Product 1")).toBeInTheDocument();
      expect(screen.getByAltText("Product 2")).toBeInTheDocument();
      expect(screen.getByAltText("Product 3")).toBeInTheDocument();
    });
  });

  //Tay Kai Jun, A0283343E
  describe("Edge Cases", () => {
    //Tay Kai Jun, A0283343E
    test("should handle products with zero price", () => {
      // Arrange
      const mockProducts = [
        {
          _id: "1",
          name: "Free Product",
          description: "This is free",
          price: 0,
        },
      ];
      const mockValues = { keyword: "free", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByText("$ 0")).toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
    test("should handle products with very short descriptions", () => {
      // Arrange
      const mockProducts = [
        {
          _id: "1",
          name: "Product",
          description: "Short",
          price: 50,
        },
      ];
      const mockValues = { keyword: "test", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByText("Short...")).toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
    test("should handle large number of results", () => {
      // Arrange
      const mockProducts = Array.from({ length: 50 }, (_, i) => ({
        _id: `${i}`,
        name: `Product ${i}`,
        description: `Description for product ${i}`,
        price: i * 10,
      }));
      const mockValues = { keyword: "test", results: mockProducts };
      useSearch.mockReturnValue([mockValues, mockSetValues]);

      // Act
      renderWithRouter(<Search />);

      // Assert
      expect(screen.getByText("Found 50")).toBeInTheDocument();
      expect(screen.getByText("Product 0")).toBeInTheDocument();
      expect(screen.getByText("Product 49")).toBeInTheDocument();
    });
  });
});
