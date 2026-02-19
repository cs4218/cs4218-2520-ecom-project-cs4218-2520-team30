import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import HomePage from "./HomePage";
import "@testing-library/jest-dom";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("axios");

jest.mock("../components/Layout", () => ({ children, title }) => (
  <div data-testid="mock-layout">
    <h1>{title}</h1>
    {children}
  </div>
));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));
import { useCart } from "../context/cart";

jest.mock("../components/Prices", () => ({
  Prices: [{ _id: 0, name: "$0-19", array: [0, 19] }],
}));

jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span data-testid="reload-icon" />,
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn() },
}));
import toast from "react-hot-toast";

const flushPromises = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe("HomePage Component", () => {
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy?.mockRestore();
  });

  it("renders the banner and static assets correctly", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { total: 0 } })
      .mockResolvedValueOnce({ data: { products: [] } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // ASSERT
    expect(screen.getByTestId("mock-layout")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Best offers/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("img", { name: /bannerimage/i })).toBeInTheDocument();
    expect(screen.getAllByText(/All Products/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Filter By Category/i)).toBeInTheDocument();
    await flushPromises();
  });

  it("fetches and displays a list of products", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockProducts = [
      {
        _id: "1",
        name: "Gaming Laptop",
        price: 999,
        slug: "gaming-laptop",
        description: "High performance",
      },
      {
        _id: "2",
        name: "Mechanical Keyboard",
        price: 150,
        slug: "mech-keyboard",
        description: "Clicky keys",
      },
    ];

    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { total: 2 } })
      .mockResolvedValueOnce({ data: { products: mockProducts } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
      expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();
    });
    expect(screen.getByText("$999.00")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    await flushPromises();
  });

  it("handles API errors gracefully", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    axios.get.mockRejectedValue(new Error("Network Error"));

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // ASSERT
    await waitFor(() => {
      expect(logSpy).toHaveBeenCalled();
    });
    await flushPromises();
  });

  it("renders categories and handleFilter updates checked state", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockCategories = [{ _id: "cat1", name: "Electronics" }];
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
      .mockResolvedValueOnce({ data: { total: 0 } })
      .mockResolvedValueOnce({ data: { products: [] } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
    });

    const checkbox = screen.getByRole("checkbox", { name: /Electronics/i });
    fireEvent.click(checkbox);
    // ASSERT
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    await flushPromises();
  });

  it("filters products by category when checkbox is checked", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockCategories = [{ _id: "cat1", name: "Electronics" }];
    const filteredProducts = [
      { _id: "f1", name: "Filtered Laptop", price: 800, slug: "filtered", description: "Filtered desc" },
    ];
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
      .mockResolvedValueOnce({ data: { total: 1 } })
      .mockResolvedValueOnce({ data: { products: [] } });
    axios.post.mockResolvedValueOnce({ data: { products: filteredProducts } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("checkbox", { name: /Electronics/i }));

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText("Filtered Laptop")).toBeInTheDocument();
    });
    expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", expect.any(Object));
    await flushPromises();
  });

  it("filters products by price when radio is selected", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { total: 0 } })
      .mockResolvedValueOnce({ data: { products: [] } });
    axios.post.mockResolvedValue({ data: { products: [] } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("$0-19")).toBeInTheDocument());
    const radio = screen.getByRole("radio", { name: /\$0-19/i });
    fireEvent.click(radio);

    // ASSERT
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        expect.objectContaining({ checked: [] })
      );
    });
    await flushPromises();
  });

  it("shows Loadmore button and loads more products on click", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const initialProducts = [
      { _id: "1", name: "Product One", price: 100, slug: "one", description: "Desc one" },
    ];
    const moreProducts = [
      { _id: "2", name: "Product Two", price: 200, slug: "two", description: "Desc two" },
    ];
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { total: 2 } })
      .mockResolvedValueOnce({ data: { products: initialProducts } })
      .mockResolvedValueOnce({ data: { products: moreProducts } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Product One")).toBeInTheDocument());
    const loadMoreBtn = screen.getByRole("button", { name: /Loadmore/i });
    fireEvent.click(loadMoreBtn);

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText("Product Two")).toBeInTheDocument();
    });
    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/2");
    await flushPromises();
  });

  it("navigates to product detail when More Details is clicked", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockProducts = [
      { _id: "1", name: "Gaming Laptop", price: 999, slug: "gaming-laptop", description: "High performance" },
    ];
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { total: 1 } })
      .mockResolvedValueOnce({ data: { products: mockProducts } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Gaming Laptop")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /More Details/i }));

    // ASSERT
    expect(mockNavigate).toHaveBeenCalledWith("/product/gaming-laptop");
    await flushPromises();
  });

  it("adds product to cart and shows toast when ADD TO CART is clicked", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockSetCart = jest.fn();
    useCart.mockReturnValue([[], mockSetCart]);
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});

    const mockProducts = [
      { _id: "1", name: "Gaming Laptop", price: 999, slug: "gaming-laptop", description: "High performance" },
    ];
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { total: 1 } })
      .mockResolvedValueOnce({ data: { products: mockProducts } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Gaming Laptop")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /ADD TO CART/i }));

    // ASSERT
    expect(mockSetCart).toHaveBeenCalledWith([mockProducts[0]]);
    expect(setItemSpy).toHaveBeenCalledWith("cart", JSON.stringify([mockProducts[0]]));
    expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    setItemSpy.mockRestore();
    await flushPromises();
  });

  it("calls window.location.reload when RESET FILTERS is clicked", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const reloadMock = jest.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { total: 0 } })
      .mockResolvedValueOnce({ data: { products: [] } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("mock-layout")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /RESET FILTERS/i }));

    // ASSERT
    expect(reloadMock).toHaveBeenCalled();
    await flushPromises();
  });

  it("handles filterProduct API error", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockCategories = [{ _id: "cat1", name: "Electronics" }];
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
      .mockResolvedValueOnce({ data: { total: 0 } })
      .mockResolvedValueOnce({ data: { products: [] } });
    axios.post.mockRejectedValueOnce(new Error("Filter failed"));

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("checkbox", { name: /Electronics/i }));

    // ASSERT
    await waitFor(() => {
      expect(logSpy).toHaveBeenCalled();
    });
    await flushPromises();
  });

  it("does not call getAllProducts when both category and price filters are set", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockCategories = [{ _id: "cat1", name: "Electronics" }];
    const filteredByBoth = [
      { _id: "b1", name: "Filtered Product", price: 50, slug: "fp", description: "Desc" },
    ];
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
      .mockResolvedValueOnce({ data: { total: 1 } })
      .mockResolvedValueOnce({ data: { products: [] } });
    axios.post.mockResolvedValue({ data: { products: filteredByBoth } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("checkbox", { name: /Electronics/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const getCallCount = axios.get.mock.calls.length;
    fireEvent.click(screen.getByRole("radio", { name: /\$0-19/i }));

    // ASSERT
    await waitFor(() => expect(screen.getByText("Filtered Product")).toBeInTheDocument());
    expect(axios.get.mock.calls.length).toBe(getCallCount);
    await flushPromises();
  });

  it("does not set categories when get-category returns success false", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    axios.get
      .mockResolvedValueOnce({ data: { success: false } })
      .mockResolvedValueOnce({ data: { total: 0 } })
      .mockResolvedValueOnce({ data: { products: [] } });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText(/Filter By Category/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await flushPromises();
  });

  it("handles loadMore API error", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const initialProducts = [
      { _id: "1", name: "Product One", price: 100, slug: "one", description: "Desc one" },
    ];
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { total: 2 } })
      .mockResolvedValueOnce({ data: { products: initialProducts } })
      .mockRejectedValueOnce(new Error("Load more failed"));

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Product One")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Loadmore/i }));

    // ASSERT
    await waitFor(() => {
      expect(logSpy).toHaveBeenCalled();
    });
    await flushPromises();
  });
});
