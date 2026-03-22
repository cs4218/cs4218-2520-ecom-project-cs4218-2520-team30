/**
 * Frontend integration: HomePage + real useCategory hook; axios stubbed at the network boundary.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import HomePage from "./HomePage";
import { AuthProvider } from "../context/auth";
import { SearchProvider } from "../context/search";
import { CartProvider } from "../context/cart";
import "@testing-library/jest-dom";

const TestProviders = ({ children }) => (
  <MemoryRouter>
    <AuthProvider>
      <SearchProvider>
        <CartProvider>{children}</CartProvider>
      </SearchProvider>
    </AuthProvider>
  </MemoryRouter>
);

describe("HomePage integration (useCategory + axios stub)", () => {
  let getSpy;
  let postSpy;
  let logSpy;

  /** @type {{ _id: string; name: string; slug: string }[]} */
  let categoryStub;

  beforeEach(() => {
    categoryStub = [];
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    postSpy = jest.spyOn(axios, "post").mockResolvedValue({ data: { products: [] } });
    getSpy = jest.spyOn(axios, "get").mockImplementation((url) => {
      const u = String(url);
      if (u.includes("/category/get-category")) {
        return Promise.resolve({ data: { success: true, category: categoryStub } });
      }
      if (u.includes("/product-count")) {
        return Promise.resolve({ data: { total: 0 } });
      }
      if (u.includes("/product-list")) {
        return Promise.resolve({ data: { products: [] } });
      }
      return Promise.reject(new Error(`Unmocked GET ${url}`));
    });
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
    logSpy.mockRestore();
  });

  // Test Generation Technique: Equivalence Partitioning (Valid/Empty/Error)
  describe("Equivalence Partitioning (Valid/Empty/Error)", () => {
    it("renders two category checkboxes when the API returns two categories (valid partition)", async () => {
      // Lum Yi Ren Johannsen, A0273503L
      // ARRANGE
      categoryStub = [
        { _id: "c1", name: "Electronics", slug: "electronics" },
        { _id: "c2", name: "Books", slug: "books" },
      ];

      // ACT
      render(
        <TestProviders>
          <HomePage />
        </TestProviders>
      );

      // ASSERT
      await waitFor(() => {
        expect(screen.getByRole("checkbox", { name: /Electronics/i })).toBeInTheDocument();
      });
      expect(screen.getByRole("checkbox", { name: /Books/i })).toBeInTheDocument();
      expect(screen.getAllByRole("checkbox")).toHaveLength(2);
      expect(screen.getByText(/Filter By Category/i)).toBeInTheDocument();
      expect(screen.getByText(/All Products/i)).toBeInTheDocument();
    });

    it("renders no category checkboxes when the API returns an empty list (empty / boundary partition)", async () => {
      // Lum Yi Ren Johannsen, A0273503L
      // ARRANGE
      categoryStub = [];

      // ACT
      render(
        <TestProviders>
          <HomePage />
        </TestProviders>
      );

      // ASSERT
      await waitFor(() => {
        expect(screen.getByText(/Filter By Category/i)).toBeInTheDocument();
      });
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(screen.getByText(/All Products/i)).toBeInTheDocument();
    });

    it("handles API errors gracefully without crashing the UI (error partition)", async () => {
      // Lum Yi Ren Johannsen, A0273503L
      // ARRANGE
      getSpy.mockImplementation((url) => {
        const u = String(url);
        if (u.includes("/category/get-category")) {
          return Promise.reject(new Error("Network Error"));
        }
        if (u.includes("/product-count")) {
          return Promise.resolve({ data: { total: 0 } });
        }
        if (u.includes("/product-list")) {
          return Promise.resolve({ data: { products: [] } });
        }
        return Promise.reject(new Error(`Unmocked GET ${u}`));
      });

      // ACT
      render(
        <TestProviders>
          <HomePage />
        </TestProviders>
      );

      // ASSERT
      await waitFor(() => {
        expect(screen.getByText(/Filter By Category/i)).toBeInTheDocument();
      });
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(screen.getByText(/All Products/i)).toBeInTheDocument();
    });
  });
});
