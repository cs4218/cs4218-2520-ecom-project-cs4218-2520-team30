import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";
import CreateCategory from "./CreateCategory";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../components/AdminMenu", () => ({
  __esModule: true,
  default: () => <nav>Admin Menu</nav>,
}));

jest.mock("antd", () => ({
  // Alek Kwek, A0273471A
  Modal: ({ children, open }) =>
    open ? <div data-testid="edit-modal">{children}</div> : null,
}));

const renderCreateCategory = () => render(<CreateCategory />);

describe("CreateCategory integration tests", () => {
  // Alek Kwek, A0273471A
  beforeEach(() => {

    jest.resetAllMocks();
  });

  // Alek Kwek, A0273471A
  it("loads categories on mount and renders them in the table", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        category: [
          { _id: "1", name: "Electronics" },
          { _id: "2", name: "Books" },
        ],
      },
    });

    renderCreateCategory();

    expect(await screen.findByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
  });

  // Alek Kwek, A0273471A
  it("submits the real CategoryForm, creates a category, and refreshes the rendered list", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          category: [{ _id: "1", name: "Electronics" }],
        },
      });
    axios.post.mockResolvedValueOnce({
      data: { success: true },
    });

    renderCreateCategory();

    fireEvent.change(
      await screen.findByPlaceholderText("Enter new category"),
      { target: { value: "Electronics" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/category/create-category",
        { name: "Electronics" }
      );
    });
    expect(await screen.findByText("Electronics")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("Electronics is created");
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  // Alek Kwek, A0273471A
  it("opens the edit modal, updates through the modal CategoryForm, and refreshes the table", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          category: [{ _id: "1", name: "Electronics" }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          category: [{ _id: "1", name: "Home Appliances" }],
        },
      });
    axios.put.mockResolvedValueOnce({
      data: { success: true },
    });

    renderCreateCategory();

    expect(await screen.findByText("Electronics")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(await screen.findByTestId("edit-modal")).toBeInTheDocument();

    const modalInputs = screen.getAllByPlaceholderText("Enter new category");
    fireEvent.change(modalInputs[modalInputs.length - 1], {
      target: { value: "Home Appliances" },
    });

    const submitButtons = screen.getAllByRole("button", { name: /submit/i });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/category/update-category/1",
        { name: "Home Appliances" }
      );
    });
    expect(await screen.findByText("Home Appliances")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("Home Appliances is updated");
  });

  // Alek Kwek, A0273471A
  it("deletes a category and refreshes the table contents", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          category: [{ _id: "1", name: "Electronics" }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          category: [],
        },
      });
    axios.delete.mockResolvedValueOnce({
      data: { success: true },
    });

    renderCreateCategory();

    expect(await screen.findByText("Electronics")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        "/api/v1/category/delete-category/1"
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith("category is deleted");
  });
});
