// ============================================================
// UNIT TESTS: CartPage Component
// ============================================================
// Basil Boh, A0273232M
//
// Cart page unit tests (Jest + React Testing Library).
// Mocks Layout, cart/auth context, router, Braintree, axios, and toast.
// Tests use Arrange–Act–Assert.
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import CartPage from "./CartPage";
import { useCart } from "../context/cart";
import { useAuth } from "../context/auth";
import axios from "axios";

const mockSetCart = jest.fn();
const mockNavigate = jest.fn();

jest.mock("../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock DropIn to call onInstance so handlePayment can run
jest.mock("braintree-web-drop-in-react", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: function MockDropIn(props) {
      React.useEffect(() => {
        if (props.onInstance) {
          props.onInstance({
            requestPaymentMethod: () => Promise.resolve({ nonce: "test-nonce" }),
          });
        }
      }, []);
      return React.createElement("div", { "data-testid": "braintree-dropin" });
    },
  };
});

jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("react-icons/ai", () => ({
  AiFillWarning: () => <span data-testid="icon-warning" />,
}));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

// ----------------------------------------------------------
// Cart Page: render, guest, user greeting, empty cart, items
// ----------------------------------------------------------
// Basil Boh, A0273232M
describe("Cart Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCart.mockReturnValue([[], mockSetCart]);
    useAuth.mockReturnValue([{ user: null, token: null }, jest.fn()]);
    // Default: get never resolves so getToken() does not trigger act() in most tests
    axios.get.mockImplementation(() => new Promise(() => {}));
    axios.post.mockResolvedValue({ data: {} });
  });

  it("renders the cart page", () => {
    // Arrange: empty cart, guest user (set in beforeEach)
    // Act: render the Cart page inside MemoryRouter
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    // Assert: layout wrapper is present in the document
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it("shows Hello Guest when not logged in", () => {
    // Arrange: guest user (no auth)
    useAuth.mockReturnValue([{ user: null, token: null }, jest.fn()]);
    // Act: render the Cart page
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    // Assert: guest greeting is displayed
    expect(screen.getByText(/Hello Guest/i)).toBeInTheDocument();
  });

  it("shows user name when logged in", () => {
    // Arrange: logged-in user with name
    useAuth.mockReturnValue([
      { user: { name: "Jane" }, token: "fake-token" },
      jest.fn(),
    ]);
    // Act: render the Cart page
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    // Assert: user name appears in the greeting
    expect(screen.getByText(/Jane/)).toBeInTheDocument();
  });

  it("shows Your Cart Is Empty when cart is empty", () => {
    // Arrange: empty cart
    useCart.mockReturnValue([[], mockSetCart]);
    // Act: render the Cart page
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    // Assert: empty cart message is displayed
    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
  });

  it("shows item count and product when cart has items", () => {
    // Arrange: cart with one item
    const cartItems = [
      {
        _id: "1",
        name: "Test Product",
        description: "A product description that is long enough",
        price: 99,
      },
    ];
    useCart.mockReturnValue([cartItems, mockSetCart]);
    // Act: render the Cart page
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    // Assert: item count and product name are displayed
    expect(screen.getByText(/You Have 1 items in your cart/i)).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
  });

  it("shows Cart Summary and Total", () => {
    // Arrange: cart with one item so summary is visible
    const cartItems = [
      {
        _id: "1",
        name: "Item",
        description: "Description here",
        price: 50,
      },
    ];
    useCart.mockReturnValue([cartItems, mockSetCart]);
    // Act: render the Cart page
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    // Assert: Cart Summary and Total are displayed
    expect(screen.getByText("Cart Summary")).toBeInTheDocument();
    expect(screen.getByText(/Total :/i)).toBeInTheDocument();
  });

  it("Remove button updates cart via setCart", () => {
    // Arrange: cart with one item
    const cartItems = [
      {
        _id: "1",
        name: "Item",
        description: "Description here",
        price: 10,
      },
    ];
    useCart.mockReturnValue([cartItems, mockSetCart]);
    // Act: render and click Remove
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("Remove"));
    // Assert: setCart was called with an empty array (item removed)
    expect(mockSetCart).toHaveBeenCalledWith([]);
  });

  it("shows please login to checkout when guest has items in cart", () => {
    // Arrange: cart with items, no auth (guest)
    const cartItems = [
      {
        _id: "1",
        name: "Item",
        description: "Desc",
        price: 10,
      },
    ];
    useCart.mockReturnValue([cartItems, mockSetCart]);
    useAuth.mockReturnValue([{ user: null, token: null }, jest.fn()]);
    // Act: render the Cart page
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    // Assert: login button is displayed (note: app has typo "Plase")
    expect(screen.getByRole("button", { name: /Plase Login to checkout/i })).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Error paths: totalPrice catch, removeCartItem catch
  // ----------------------------------------------------------
  // Basil Boh, A0273232M
  it("totalPrice catch: does not crash when price access throws", () => {
    // Arrange: item whose price getter throws on second access (list renders first, then totalPrice())
    let accessCount = 0;
    const throwingItem = {
      _id: "1",
      name: "Item",
      description: "Desc",
      get price() {
        accessCount++;
        if (accessCount > 1) throw new Error("price error");
        return 10;
      },
    };
    useCart.mockReturnValue([[throwingItem], mockSetCart]);
    // Act: render (list uses price once, totalPrice() uses it again and catch runs)
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    // Assert: component still rendered
    expect(screen.getByText(/Total :/i)).toBeInTheDocument();
  });

  it("removeCartItem catch: does not crash when setCart throws", () => {
    // Arrange: setCart throws on first call
    const cartItems = [{ _id: "1", name: "Item", description: "D", price: 10 }];
    useCart.mockReturnValue([cartItems, mockSetCart]);
    mockSetCart.mockImplementationOnce(() => {
      throw new Error("setCart error");
    });
    // Act: render and click Remove
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("Remove"));
    // Assert: setCart was called; component did not crash
    expect(mockSetCart).toHaveBeenCalled();
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // getToken: success and catch
  // ----------------------------------------------------------
  // Basil Boh, A0273232M
  it("getToken success: sets clientToken and shows payment UI", async () => {
    // Arrange: axios.get resolves; logged in with token; cart has items
    axios.get.mockResolvedValue({ data: { clientToken: "test-token" } });
    useAuth.mockReturnValue([
      { user: { name: "Jane", address: "123 Main St" }, token: "fake-token" },
      jest.fn(),
    ]);
    useCart.mockReturnValue(
      [[{ _id: "1", name: "P", description: "Desc", price: 10 }], mockSetCart]
    );
    // Act: render
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    // Assert: after useEffect, DropIn (payment UI) appears
    await waitFor(() => {
      expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
    });
    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token");
  });

  it("getToken catch: handles token request error", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error("network error"));
    useAuth.mockReturnValue([{ user: null, token: "t" }, jest.fn()]);
    // Act: render (useEffect runs getToken, it rejects)
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    // Assert: catch ran (console.log called with error)
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  // ----------------------------------------------------------
  // Address and navigation: Current Address, Update Address, Login to checkout
  // ----------------------------------------------------------
  // Basil Boh, A0273232M
  it("shows Current Address and Update Address when user has address", () => {
    useAuth.mockReturnValue([
      { user: { name: "Jane", address: "123 Main St" }, token: "t" },
      jest.fn(),
    ]);
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Current Address")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Update Address/i })).toBeInTheDocument();
  });

  it("shows Update Address when logged in without address", () => {
    useAuth.mockReturnValue([
      { user: { name: "Jane" }, token: "t" },
      jest.fn(),
    ]);
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    const updateButtons = screen.getAllByRole("button", { name: /Update Address/i });
    expect(updateButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("Update Address click navigates to profile when user has address", () => {
    useAuth.mockReturnValue([
      { user: { name: "J", address: "123 St" }, token: "t" },
      jest.fn(),
    ]);
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: /Update Address/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("Update Address click navigates to profile when user has no address", () => {
    useAuth.mockReturnValue([
      { user: { name: "J" }, token: "t" },
      jest.fn(),
    ]);
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: /Update Address/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("Plase Login to checkout click navigates to login with state", () => {
    useCart.mockReturnValue(
      [[{ _id: "1", name: "I", description: "D", price: 10 }], mockSetCart]
    );
    useAuth.mockReturnValue([{ user: null, token: null }, jest.fn()]);
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: /Plase Login to checkout/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });

  // ----------------------------------------------------------
  // handlePayment: success and catch
  // ----------------------------------------------------------
  // Basil Boh, A0273232M
  it("handlePayment success: posts payment, clears cart, navigates, toasts", async () => {
    const toast = require("react-hot-toast");
    axios.get.mockResolvedValue({ data: { clientToken: "t" } });
    axios.post.mockResolvedValue({ data: {} });
    useAuth.mockReturnValue([
      { user: { name: "J", address: "456 Ave" }, token: "t" },
      jest.fn(),
    ]);
    useCart.mockReturnValue(
      [[{ _id: "1", name: "P", description: "D", price: 10 }], mockSetCart]
    );
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
    });
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /Make Payment/i });
      expect(btn).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /Make Payment/i }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/product/braintree/payment", {
        nonce: "test-nonce",
        cart: [{ _id: "1", name: "P", description: "D", price: 10 }],
      });
    });
    expect(mockSetCart).toHaveBeenCalledWith([]);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
    expect(toast.success).toHaveBeenCalledWith("Payment Completed Successfully ");
  });

  it("handlePayment catch: resets loading on payment error", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockResolvedValue({ data: { clientToken: "t" } });
    axios.post.mockRejectedValue(new Error("payment failed"));
    useAuth.mockReturnValue([
      { user: { name: "J", address: "456 Ave" }, token: "t" },
      jest.fn(),
    ]);
    useCart.mockReturnValue(
      [[{ _id: "1", name: "P", description: "D", price: 10 }], mockSetCart]
    );
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
    });
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /Make Payment/i });
      expect(btn).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /Make Payment/i }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
