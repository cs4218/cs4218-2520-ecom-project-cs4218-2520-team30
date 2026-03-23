// Alek Kwek, A0273471A
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import UpdateProduct from "./UpdateProduct";

jest.mock("axios");
jest.mock("react-hot-toast", () => {
  const React = require("react");
  const toast = {
    success: jest.fn(),
    error: jest.fn(),
  };

  return {
    __esModule: true,
    default: toast,
    Toaster: () => React.createElement("div", { "data-testid": "toast-host" }),
  };
});
jest.mock("../../components/Header", () => () => (
  <div data-testid="app-header">Header</div>
));
jest.mock("../../components/Footer", () => () => (
  <div data-testid="app-footer">Footer</div>
));
jest.mock("../../components/Form/SearchInput", () => () => (
  <div data-testid="search-input" />
));
jest.mock("../../hooks/useCategory", () => () => []);
jest.mock("../../context/auth", () => ({
  useAuth: () => [
    { user: { name: "Admin Tester", role: 1 }, token: "admin-token" },
    jest.fn(),
  ],
}));
jest.mock("../../context/cart", () => ({
  useCart: () => [[], jest.fn()],
}));
jest.mock("../../context/search", () => ({
  useSearch: () => [{ keyword: "" }, jest.fn()],
}));
jest.mock("antd", () => {
  const React = require("react");

  const Select = ({ children, onChange, placeholder, value }) =>
    React.createElement(
      "select",
      {
        "data-testid": placeholder?.trim().toLowerCase().replace(/\s+/g, "-"),
        onChange: (event) => onChange?.(event.target.value),
        value: value ?? "",
      },
      React.createElement("option", { value: "" }, "Select"),
      children
    );

  Select.Option = ({ children, value }) =>
    React.createElement("option", { value }, children);

  return {
    Select,
    Badge: ({ children }) => React.createElement("span", null, children),
  };
});

const mockProduct = {
  _id: "prod-123",
  name: "Studio Monitor",
  description: "Near-field speaker",
  price: 499,
  quantity: 12,
  shipping: true,
  category: { _id: "cat-1", name: "Audio" },
};

const mockCategories = [
  { _id: "cat-1", name: "Audio" },
  { _id: "cat-2", name: "Accessories" },
];

// Alek Kwek, A0273471A
const mockAdminProductRequests = () => {
  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/product/get-product/studio-monitor") {
      return Promise.resolve({ data: { product: mockProduct } });
    }

    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: { success: true, category: mockCategories },
      });
    }

    return Promise.reject(new Error(`Unexpected GET request: ${url}`));
  });
};

// Alek Kwek, A0273471A
const renderUpdateProductPage = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/admin/product/studio-monitor"]}>
      <Routes>
        <Route
          path="/dashboard/admin/product/:slug"
          element={<UpdateProduct />}
        />
        <Route
          path="/dashboard/admin/products"
          element={<h2>Products Listing</h2>}
        />
      </Routes>
    </MemoryRouter>
  );

// Alek Kwek, A0273471A
describe("UpdateProduct integration", () => {
  beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => "blob:updated-product-photo");
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads the existing product into the admin edit screen and preserves the app shell", async () => {
    mockAdminProductRequests();

    renderUpdateProductPage();

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Studio Monitor")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: /update product/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
    expect(
      screen.getByAltText("product_photo")
    ).toHaveAttribute("src", "/api/v1/product/product-photo/prod-123");
    expect(screen.getByTestId("toast-host")).toBeInTheDocument();
  });

  it("submits edited values through the update route and returns to the products screen", async () => {
    mockAdminProductRequests();
    axios.put.mockResolvedValueOnce({
      data: { success: true, message: "Product updated" },
    });

    renderUpdateProductPage();

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Studio Monitor")
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
      target: { value: "Studio Monitor Pro" },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a description/i), {
      target: { value: "Updated monitor description" },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a price/i), {
      target: { value: "579" },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a quantity/i), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByTestId("select-a-category"), {
      target: { value: "cat-2" },
    });
    fireEvent.change(screen.getByTestId("select-shipping"), {
      target: { value: "0" },
    });

    const photo = new File(["new-image"], "monitor.png", {
      type: "image/png",
    });
    fireEvent.change(document.querySelector('input[name="photo"]'), {
      target: { files: [photo] },
    });

    fireEvent.click(screen.getByRole("button", { name: /update product/i }));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/product/update-product/prod-123",
        expect.any(FormData)
      );
    });

    const submittedData = axios.put.mock.calls[0][1];
    expect(submittedData.get("name")).toBe("Studio Monitor Pro");
    expect(submittedData.get("description")).toBe(
      "Updated monitor description"
    );
    expect(submittedData.get("price")).toBe("579");
    expect(submittedData.get("quantity")).toBe("15");
    expect(submittedData.get("category")).toBe("cat-2");
    expect(submittedData.get("shipping")).toBe("0");
    expect(submittedData.get("photo")).toBe(photo);

    expect(await screen.findByText("Products Listing")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(
      "Product Updated Successfully"
    );
  });

  it("deletes the product only after confirmation and navigates back to the products list", async () => {
    mockAdminProductRequests();
    axios.delete.mockResolvedValueOnce({ data: { success: true } });
    jest.spyOn(window, "prompt").mockReturnValue("DELETE");

    renderUpdateProductPage();

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Studio Monitor")
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete product/i }));

    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalledWith(
        "Are You Sure want to delete this product ? "
      );
      expect(axios.delete).toHaveBeenCalledWith(
        "/api/v1/product/delete-product/prod-123"
      );
    });

    expect(await screen.findByText("Products Listing")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully");
  });
});
