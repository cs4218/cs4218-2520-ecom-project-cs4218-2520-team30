import React from "react";
import { render, renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { AuthProvider, useAuth } from "./auth.js";

jest.mock("axios");

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Setup axios defaults mock
axios.defaults = {
  headers: {
    common: {},
  },
};

describe("Auth Context - AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    axios.defaults.headers.common = {};
  });

  describe("Initial State - Equivalence Partitions", () => {
    //Tay Kai Jun, A0283343E
    test("should provide initial auth state with null user and empty token", () => {
      // Arrange
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act & Assert
      expect(result.current[0]).toEqual({
        user: null,
        token: "",
      });
      expect(typeof result.current[1]).toBe("function");
    });

    //Tay Kai Jun, A0283343E
    test("should not set axios authorization header when no token exists", () => {
      // Arrange
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

      // Act
      renderHook(() => useAuth(), { wrapper });

      // Assert
      expect(axios.defaults.headers.common["Authorization"]).toBe("");
    });
  });

  describe("LocalStorage Integration - Data Flow", () => {
    //Tay Kai Jun, A0283343E
    test("should load auth data from localStorage on mount", async () => {
      // Arrange
      const mockAuthData = {
        user: { id: "user123", name: "John Doe", email: "john@test.com" },
        token: "mock-jwt-token-12345",
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAuthData));
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => {
        expect(result.current[0].token).toBe(mockAuthData.token);
      });

      // Assert
      expect(localStorageMock.getItem).toHaveBeenCalledWith("auth");
      expect(result.current[0].user).toEqual(mockAuthData.user);
      expect(result.current[0].token).toBe(mockAuthData.token);
    });

    //Tay Kai Jun, A0283343E
    test("should set axios authorization header from localStorage token", async () => {
      // Arrange
      const mockAuthData = {
        user: { id: "admin456", name: "Admin User" },
        token: "admin-token-xyz",
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAuthData));
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => {
        expect(result.current[0].token).toBe("admin-token-xyz");
      });

      // Assert
      expect(axios.defaults.headers.common["Authorization"]).toBe("admin-token-xyz");
    });

    //Tay Kai Jun, A0283343E
    test("should maintain initial state when localStorage is empty", () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue(null);
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      expect(localStorageMock.getItem).toHaveBeenCalledWith("auth");
      expect(result.current[0]).toEqual({
        user: null,
        token: "",
      });
    });
  });

  describe("Boundary Cases - LocalStorage Data", () => {
    //Tay Kai Jun, A0283343E
    test("should handle malformed JSON in localStorage", () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue("{invalid json");
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      expect(result.current[0]).toEqual({
        user: null,
        token: "",
      });
      consoleSpy.mockRestore();
    });

    //Tay Kai Jun, A0283343E
    test("should handle empty string in localStorage", () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue("");
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      expect(result.current[0]).toEqual({
        user: null,
        token: "",
      });
    });

    //Tay Kai Jun, A0283343E
    test("should handle localStorage with only user (missing token)", async () => {
      // Arrange
      const mockAuthData = {
        user: { id: "user123", name: "John" },
        // token is missing
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAuthData));
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => {
        expect(result.current[0].user).toEqual(mockAuthData.user);
      });

      // Assert
      expect(result.current[0].user).toEqual(mockAuthData.user);
      expect(result.current[0].token).toBeUndefined();
    });

    //Tay Kai Jun, A0283343E
    test("should handle localStorage with only token", async () => {
      // Arrange
      const mockAuthData = {
        token: "standalone-token",
        // user is missing
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAuthData));
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => {
        expect(result.current[0].token).toBe("standalone-token");
      });

      // Assert
      expect(result.current[0].user).toBeUndefined();
      expect(result.current[0].token).toBe("standalone-token");
    });
  });

  describe("State Updates - Control Flow", () => {
    //Tay Kai Jun, A0283343E
    test("should update auth state when setAuth is called", async () => {
      // Arrange
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });
      const newAuthData = {
        user: { id: "newUser", name: "New User" },
        token: "new-token",
      };

      // Act
      act(() => {
        result.current[1](newAuthData);
      });

      // Assert
      expect(result.current[0]).toEqual(newAuthData);
    });

    //Tay Kai Jun, A0283343E
    test("should update axios header when token changes", async () => {
      // Arrange
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });
      const newToken = "updated-token-abc";

      // Act
      act(() => {
        result.current[1]({
          user: { id: "user1" },
          token: newToken,
        });
      });

      // Assert
      expect(axios.defaults.headers.common["Authorization"]).toBe(newToken);
    });

    //Tay Kai Jun, A0283343E
    test("should allow partial state updates", async () => {
      // Arrange
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act - First update
      act(() => {
        result.current[1]({ user: { id: "user1" }, token: "token1" });
      });

      // Act - Partial update token only
      act(() => {
        result.current[1]((prev) => ({ ...prev, token: "token2" }));
      });

      // Assert
      expect(result.current[0].user).toEqual({ id: "user1" });
      expect(result.current[0].token).toBe("token2");
    });

    //Tay Kai Jun, A0283343E
    test("should handle clearing auth state when user logout", async () => {
      // Arrange
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act - Set initial auth
      act(() => {
        result.current[1]({ user: { id: "user1" }, token: "token1" });
      });

      // Act - Clear auth
      act(() => {
        result.current[1]({ user: null, token: "" });
      });

      // Assert
      expect(result.current[0]).toEqual({
        user: null,
        token: "",
      });
      expect(axios.defaults.headers.common["Authorization"]).toBe("");
    });
  });

  describe("Axios Header Synchronisation - Data Flow", () => {
    //Tay Kai Jun, A0283343E
    test("should sync axios header with current token on provider render", () => {
      // Arrange
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act
      act(() => {
        result.current[1]({ user: null, token: "sync-token" });
      });

      // Assert
      expect(axios.defaults.headers.common["Authorization"]).toBe("sync-token");
    });

    //Tay Kai Jun, A0283343E
    test("should update axios header to empty when token is cleared", () => {
      // Arrange
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act
      act(() => {
        result.current[1]({ user: { id: "user1" }, token: "" });
      });

      // Assert
      expect(axios.defaults.headers.common["Authorization"]).toBe("");
    });

    //Tay Kai Jun, A0283343E
    test("should handle undefined token in axios header", () => {
      // Arrange
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act
      act(() => {
        result.current[1]({ user: { id: "user1" }, token: undefined });
      });

      // Assert
      expect(axios.defaults.headers.common["Authorization"]).toBeUndefined();
    });
  });

  describe("Multiple Consumers - Context Sharing", () => {
    //Tay Kai Jun, A0283343E
    test("should share state across re-renders of the same hook", async () => {
      // Arrange
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result, rerender } = renderHook(() => useAuth(), { wrapper });

      // Act - Update auth state
      act(() => {
        result.current[1]({ user: { id: "shared" }, token: "shared-token" });
      });

      // Re-render the hook
      rerender();

      // Assert - State should persist across re-renders
      expect(result.current[0]).toEqual({
        user: { id: "shared" },
        token: "shared-token",
      });
    });
  });

  describe("Token Format - Equivalence Partitions", () => {
    //Tay Kai Jun, A0283343E
    test("should handle JWT format token", async () => {
      // Arrange
      const jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";
      const mockAuthData = {
        user: { id: "user1" },
        token: jwtToken,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAuthData));
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => {
        expect(result.current[0].token).toBe(jwtToken);
      });

      // Assert
      expect(result.current[0].token).toBe(jwtToken);
      expect(axios.defaults.headers.common["Authorization"]).toBe(jwtToken);
    });

    //Tay Kai Jun, A0283343E
    test("should handle Bearer token format", async () => {
      // Arrange
      const bearerToken = "Bearer abc123xyz";
      const mockAuthData = {
        user: { id: "user1" },
        token: bearerToken,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAuthData));
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => {
        expect(result.current[0].token).toBe(bearerToken);
      });

      // Assert
      expect(result.current[0].token).toBe(bearerToken);
    });

    //Tay Kai Jun, A0283343E
    test("should handle very long token", async () => {
      // Arrange
      const longToken = "a".repeat(1000);
      const mockAuthData = {
        user: { id: "user1" },
        token: longToken,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAuthData));
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => {
        expect(result.current[0].token).toBe(longToken);
      });

      // Assert
      expect(result.current[0].token).toBe(longToken);
      expect(result.current[0].token.length).toBe(1000);
    });
  });

  describe("Component Rendering", () => {
    //Tay Kai Jun, A0283343E
    test("should render children components", () => {
      // Arrange & Act
      const { getByText } = render(
        <AuthProvider>
          <div>Test Child Component</div>
        </AuthProvider>
      );

      // Assert
      expect(getByText("Test Child Component")).toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
    test("should render multiple children", () => {
      // Arrange & Act
      const { getByText } = render(
        <AuthProvider>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </AuthProvider>
      );

      // Assert
      expect(getByText("Child 1")).toBeInTheDocument();
      expect(getByText("Child 2")).toBeInTheDocument();
      expect(getByText("Child 3")).toBeInTheDocument();
    });
  });

  describe("useAuth Hook - Error Cases", () => {
    //Tay Kai Jun, A0283343E
    test("should throw error when useAuth is used outside AuthProvider", () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Act & Assert
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleSpy.mockRestore();
    });
  });
});
