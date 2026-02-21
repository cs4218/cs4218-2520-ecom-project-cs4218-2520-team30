import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Categories from "./Categories";
import useCategory from "../hooks/useCategory";

jest.mock("../hooks/useCategory");
jest.mock("../components/Layout", () => ({ children, title }) => (
  <div data-testid="mock-layout">
    <h1>{title}</h1>
    {children}
  </div>
));

describe("Categories Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the list of categories and links", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockCategories = [
      { _id: "1", name: "Gaming", slug: "gaming" },
      { _id: "2", name: "Sports", slug: "sports" },
    ];
    useCategory.mockReturnValue(mockCategories);

    // ACT
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    // ASSERT
    expect(screen.getByText("Gaming")).toBeInTheDocument();
    expect(screen.getByText("Sports")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gaming" })).toHaveAttribute(
      "href",
      "/category/gaming"
    );
    expect(screen.getByRole("link", { name: "Sports" })).toHaveAttribute(
      "href",
      "/category/sports"
    );
    expect(screen.getByText("All Categories")).toBeInTheDocument();
    expect(screen.getByTestId("mock-layout")).toBeInTheDocument();
  });

  it("renders empty state when no categories", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    useCategory.mockReturnValue([]);

    // ACT
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    // ASSERT
    expect(screen.getByTestId("mock-layout")).toBeInTheDocument();
    expect(screen.getByText("All Categories")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Gaming" })).not.toBeInTheDocument();
  });
});
