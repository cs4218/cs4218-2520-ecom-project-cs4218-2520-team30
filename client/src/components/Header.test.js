import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("./Form/SearchInput", () => () => (
  <div data-testid="search-input">Search</div>
));

import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";
import useCategory from "../hooks/useCategory";
import Header from "./Header";

describe("Header Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCategory.mockReturnValue([]);
  });

  it("renders Register and Login links for Guest users", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    // Simulate a Guest (no user, empty token) and empty cart
    useAuth.mockReturnValue([{ user: null, token: "" }, jest.fn()]);
    useCart.mockReturnValue([[]]);

    // ACT
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // ASSERT
    // Assert Register and Login are shown; Logout is NOT present
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.queryByText(/Logout/i)).not.toBeInTheDocument();
  });

  it("renders Logout link for Logged-in users", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    // Simulate a Logged-in User
    useAuth.mockReturnValue([
      { user: { name: "John Doe", role: 0 }, token: "valid-token" },
      jest.fn(),
    ]);
    useCart.mockReturnValue([[]]);

    // ACT
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // ASSERT
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    // Ensure Login is NOT present
    expect(screen.queryByText(/Login/i)).not.toBeInTheDocument();
  });
});
