// ============================================================
// UNIT TESTS: Cart Context (CartProvider, useCart)
// ============================================================
// Basil Boh, A0273232M
//
// Cart context unit tests (Jest + React Testing Library).
// Tests CartProvider and useCart: initial state, localStorage restore, and setCart updates.
// Uses renderHook with Arrange–Act–Assert.
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CartProvider, useCart } from "./cart";

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: mockGetItem,
      setItem: mockSetItem,
      removeItem: mockRemoveItem,
    },
    writable: true,
  });
});

// ----------------------------------------------------------
// Cart Context: CartProvider and useCart
// ----------------------------------------------------------
// Basil Boh, A0273232M
describe("Cart Context", () => {
  describe("CartProvider initialization", () => {
    it("provides initial cart as empty array when localStorage has no cart", () => {
      // Arrange: localStorage returns null for "cart"
      mockGetItem.mockReturnValue(null);
      const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

      // Act: render useCart inside provider
      const { result } = renderHook(() => useCart(), { wrapper });

      // Assert: cart is empty array
      expect(result.current[0]).toEqual([]);
      expect(Array.isArray(result.current[0])).toBe(true);
    });

    it("provides setCart function", () => {
      // Arrange
      mockGetItem.mockReturnValue(null);
      const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

      // Act
      const { result } = renderHook(() => useCart(), { wrapper });

      // Assert: second value is a function
      expect(typeof result.current[1]).toBe("function");
    });

    it("restores cart from localStorage on mount", async () => {
      // Arrange: localStorage has existing cart JSON
      const storedCart = [{ _id: "1", name: "Product", price: 99 }];
      mockGetItem.mockReturnValue(JSON.stringify(storedCart));
      const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

      // Act: render hook (useEffect runs after mount)
      const { result } = renderHook(() => useCart(), { wrapper });

      // Assert: after effect runs, cart is restored
      await waitFor(() => {
        expect(result.current[0]).toEqual(storedCart);
      });
      expect(mockGetItem).toHaveBeenCalledWith("cart");
    });
  });

  // ----------------------------------------------------------
  // Cart state updates: setCart
  // ----------------------------------------------------------
  // Basil Boh, A0273232M
  describe("Cart state updates", () => {
    it("updates cart when setCart is called", () => {
      // Arrange: empty cart
      mockGetItem.mockReturnValue(null);
      const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
      const { result } = renderHook(() => useCart(), { wrapper });
      const newCart = [{ _id: "2", name: "New Item", price: 50 }];

      // Act: call setCart with new array
      act(() => {
        result.current[1](newCart);
      });

      // Assert: cart is updated
      expect(result.current[0]).toEqual(newCart);
    });

    it("replaces entire cart when setCart is called", () => {
      // Arrange: start with one item (from localStorage)
      const initial = [{ _id: "1", name: "A", price: 10 }];
      mockGetItem.mockReturnValue(JSON.stringify(initial));
      const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
      const { result } = renderHook(() => useCart(), { wrapper });

      // Wait for effect to run
      return waitFor(() => {
        expect(result.current[0]).toHaveLength(1);
      }).then(() => {
        // Act: set new cart with two items
        const updated = [
          { _id: "1", name: "A", price: 10 },
          { _id: "2", name: "B", price: 20 },
        ];
        act(() => {
          result.current[1](updated);
        });
        // Assert
        expect(result.current[0]).toHaveLength(2);
        expect(result.current[0]).toEqual(updated);
      });
    });

    it("can set cart to empty array", () => {
      // Arrange: cart with item from localStorage
      mockGetItem.mockReturnValue(JSON.stringify([{ _id: "1", name: "X", price: 1 }]));
      const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
      const { result } = renderHook(() => useCart(), { wrapper });

      return waitFor(() => {
        expect(result.current[0].length).toBeGreaterThan(0);
      }).then(() => {
        // Act: clear cart
        act(() => {
          result.current[1]([]);
        });
        // Assert
        expect(result.current[0]).toEqual([]);
      });
    });
  });

  // ----------------------------------------------------------
  // useCart return value [cart, setCart]
  // ----------------------------------------------------------
  // Basil Boh, A0273232M
  describe("useCart return value", () => {
    it("returns array of length 2 [cart, setCart]", () => {
      // Arrange
      mockGetItem.mockReturnValue(null);
      const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

      // Act
      const { result } = renderHook(() => useCart(), { wrapper });

      // Assert
      expect(result.current).toHaveLength(2);
      expect(Array.isArray(result.current[0])).toBe(true);
      expect(typeof result.current[1]).toBe("function");
    });
  });
});
