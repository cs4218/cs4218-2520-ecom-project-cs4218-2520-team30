import React from "react";
import { renderHook, act } from "@testing-library/react";
import { SearchProvider, useSearch } from "./search";

describe("Search Context", () => {
  describe("SearchProvider Initialization", () => {
    test("should provide initial search state with empty keyword and results", () => {
      // Arrange & Act
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });

      // Assert
      expect(result.current[0]).toEqual({
        keyword: "",
        results: [],
      });
    });

    test("should provide setAuth function", () => {
      // Arrange & Act
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });

      // Assert
      expect(typeof result.current[1]).toBe("function");
    });
  });

  describe("Search State Updates", () => {
    test("should update keyword when setAuth is called", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });

      // Act
      act(() => {
        result.current[1]({ keyword: "laptop", results: [] });
      });

      // Assert
      expect(result.current[0].keyword).toBe("laptop");
      expect(result.current[0].results).toEqual([]);
    });

    test("should update results when setAuth is called", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });
      const mockResults = [
        { _id: "1", name: "Product 1", price: 100 },
        { _id: "2", name: "Product 2", price: 200 },
      ];

      // Act
      act(() => {
        result.current[1]({ keyword: "test", results: mockResults });
      });

      // Assert
      expect(result.current[0].keyword).toBe("test");
      expect(result.current[0].results).toEqual(mockResults);
    });

    test("should update both keyword and results simultaneously", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });
      const mockResults = [{ _id: "1", name: "Phone", price: 500 }];

      // Act
      act(() => {
        result.current[1]({ keyword: "phone", results: mockResults });
      });

      // Assert
      expect(result.current[0]).toEqual({
        keyword: "phone",
        results: mockResults,
      });
    });
  });

  describe("Search State Persistence", () => {
    test("should maintain state across multiple updates", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });

      // Act - First update
      act(() => {
        result.current[1]({ keyword: "laptop", results: [] });
      });

      // Act - Second update
      act(() => {
        result.current[1]({
          keyword: "laptop",
          results: [{ _id: "1", name: "Laptop Pro", price: 1000 }],
        });
      });

      // Assert
      expect(result.current[0]).toEqual({
        keyword: "laptop",
        results: [{ _id: "1", name: "Laptop Pro", price: 1000 }],
      });
    });

    test("should clear results when setting empty array", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });

      // Act - Set initial results
      act(() => {
        result.current[1]({
          keyword: "test",
          results: [{ _id: "1", name: "Product", price: 100 }],
        });
      });

      // Act - Clear results
      act(() => {
        result.current[1]({ keyword: "test", results: [] });
      });

      // Assert
      expect(result.current[0].results).toEqual([]);
    });

    test("should clear keyword when setting empty string", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });

      // Act - Set initial keyword
      act(() => {
        result.current[1]({ keyword: "laptop", results: [] });
      });

      // Act - Clear keyword
      act(() => {
        result.current[1]({ keyword: "", results: [] });
      });

      // Assert
      expect(result.current[0].keyword).toBe("");
    });
  });

  describe("State Persistence", () => {
    test("should persist state across hook re-renders", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result, rerender } = renderHook(() => useSearch(), { wrapper });
      
      // Act - Update state
      act(() => {
        result.current[1]({ keyword: "persisted", results: [{id: 1}] });
      });
      
      // Force a re-render
      rerender();

      // Assert - State should persist after re-render
      expect(result.current[0].keyword).toBe("persisted");
      expect(result.current[0].results).toHaveLength(1);
    });
  });

  describe("Edge Cases", () => {
    test("should handle special characters in keyword", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });

      // Act
      act(() => {
        result.current[1]({
          keyword: "laptop & accessories @ 50%",
          results: [],
        });
      });

      // Assert
      expect(result.current[0].keyword).toBe("laptop & accessories @ 50%");
    });

    test("should handle very long keyword", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });
      const longKeyword = "a".repeat(1000);

      // Act
      act(() => {
        result.current[1]({ keyword: longKeyword, results: [] });
      });

      // Assert
      expect(result.current[0].keyword).toBe(longKeyword);
    });

    test("should handle large results array", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        _id: `${i}`,
        name: `Product ${i}`,
        price: i * 10,
      }));

      // Act
      act(() => {
        result.current[1]({ keyword: "test", results: largeResults });
      });

      // Assert
      expect(result.current[0].results).toHaveLength(1000);
    });

    test("should handle null or undefined gracefully", () => {
      // Arrange
      const wrapper = ({ children }) => <SearchProvider>{children}</SearchProvider>;
      const { result } = renderHook(() => useSearch(), { wrapper });

      // Act
      act(() => {
        result.current[1]({ keyword: null, results: undefined });
      });

      // Assert
      expect(result.current[0].keyword).toBe(null);
      expect(result.current[0].results).toBe(undefined);
    });
  });
});
