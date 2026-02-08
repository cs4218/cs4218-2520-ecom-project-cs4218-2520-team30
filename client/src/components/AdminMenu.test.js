import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import AdminMenu from "./AdminMenu";

describe("AdminMenu Component", () => {
    test("renders the Admin Panel header correctly", () => {
        // Arrange
        const headingName = /admin panel/i;

        // Act
        render(
            <MemoryRouter>
                <AdminMenu />
            </MemoryRouter>
        );

        // Assert
        const headingElement = screen.getByRole("heading", { name: headingName });
        expect(headingElement).toBeInTheDocument();
    });

    test("contains a navigation link to Create Category", () => {
        // Arrange
        const expectedPath = "/dashboard/admin/create-category";
        const linkName = /create category/i;

        // Act
        render(
            <MemoryRouter>
                <AdminMenu />
            </MemoryRouter>
        );

        // Assert
        const link = screen.getByRole("link", { name: linkName });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", expectedPath);
    });

    test("contains a navigation link to Create Product", () => {
        // Arrange
        const expectedPath = "/dashboard/admin/create-product";
        const linkName = /create product/i;

        // Act
        render(
            <MemoryRouter>
                <AdminMenu />
            </MemoryRouter>
        );

        // Assert
        const link = screen.getByRole("link", { name: linkName });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", expectedPath);
    });

    test("contains a navigation link to Products", () => {
        // Arrange
        const expectedPath = "/dashboard/admin/products";
        // Using explicit anchors (^) to ensure it doesn't match 'Create Product'
        const linkName = /^products$/i;

        // Act
        render(
            <MemoryRouter>
                <AdminMenu />
            </MemoryRouter>
        );

        // Assert
        const link = screen.getByRole("link", { name: linkName });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", expectedPath);
    });

    test("contains a navigation link to Orders", () => {
        // Arrange
        const expectedPath = "/dashboard/admin/orders";
        const linkName = /orders/i;

        // Act
        render(
            <MemoryRouter>
                <AdminMenu />
            </MemoryRouter>
        );

        // Assert
        const link = screen.getByRole("link", { name: linkName });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", expectedPath);
    });

    test("does not display the Users link (commented out code)", () => {
        // Arrange
        const linkName = /users/i;

        // Act
        render(
            <MemoryRouter>
                <AdminMenu />
            </MemoryRouter>
        );

        // Assert
        const link = screen.queryByRole("link", { name: linkName });
        expect(link).not.toBeInTheDocument();
    });
});