// Alek Kwek, A0273471A
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import CreateProduct from "./CreateProduct";

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

// Alek Kwek, A0273471A
const renderCreateProductPage = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
      <Routes>
        <Route
          path="/dashboard/admin/create-product"
          element={<CreateProduct />}
        />
        <Route
          path="/dashboard/admin/products"
          element={<h2>Products Listing</h2>}
        />
      </Routes>
    </MemoryRouter>
  );

// Alek Kwek, A0273471A
describe("CreateProduct integration", () => {
  beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => "blob:product-photo-preview");
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads the create product screen inside the admin shell and fetches categories", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        category: [{ _id: "cat-1", name: "Electronics" }],
      },
    });

    renderCreateProductPage();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    expect(
      screen.getByRole("heading", { name: /create product/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /products/i })
    ).toHaveAttribute("href", "/dashboard/admin/products");
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-footer")).toBeInTheDocument();
    expect(document.title).toBe("Dashboard - Create Product");
  });

  it("submits the filled form as FormData and navigates to the products screen on success", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        category: [{ _id: "cat-1", name: "Electronics" }],
      },
    });
    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "Product created" },
    });

    renderCreateProductPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("select-a-category"), {
      target: { value: "cat-1" },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
      target: { value: "Mirrorless Camera" },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a description/i), {
      target: { value: "Admin-created product" },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a price/i), {
      target: { value: "2499" },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a quantity/i), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByTestId("select-shipping"), {
      target: { value: "1" },
    });

    const photo = new File(["image-bytes"], "camera.png", {
      type: "image/png",
    });
    fireEvent.change(document.querySelector('input[name="photo"]'), {
      target: { files: [photo] },
    });

    fireEvent.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/create-product",
        expect.any(FormData)
      );
    });

    const submittedData = axios.post.mock.calls[0][1];
    expect(submittedData.get("name")).toBe("Mirrorless Camera");
    expect(submittedData.get("description")).toBe("Admin-created product");
    expect(submittedData.get("price")).toBe("2499");
    expect(submittedData.get("quantity")).toBe("7");
    expect(submittedData.get("category")).toBe("cat-1");
    expect(submittedData.get("shipping")).toBe("1");
    expect(submittedData.get("photo")).toBe(photo);

    expect(await screen.findByText("Products Listing")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(
      "Product Created Successfully"
    );
  });

  it("shows the category-fetch error toast when the integration entry request fails", async () => {
    axios.get.mockRejectedValueOnce(new Error("Category fetch failed"));

    renderCreateProductPage();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in getting category"
      );
    });
  });
});
