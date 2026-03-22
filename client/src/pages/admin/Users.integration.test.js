// Leong Soon Mun Stephane, A0273409B
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Users from "./Users";
import AdminRoute from "../../components/Routes/AdminRoute";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

global.React = React;

beforeEach(() => {
    jest.clearAllMocks();
});

// replaced mocked response objects
const user1 = {
    _id: "a0",
    name: "Bob",
    email: "bob@example.com",
    phone: "12345678",
    address: "bob address",
    role: 1,
};
const users2 = {
    _id: "u0",
    name: "Charlie",
    email: "charlie@example.com",
    phone: "12348765",
    address: "charlie address",
    role: 0,
};
const normalUser = {
    _id: "u1",
    name: "Alice",
    email: "alice@example.com",
    phone: "87654321",
    address: "alice address",
    role: 0,
};
const adminUser = {
    _id: "a1",
    name: "Tester",
    email: "test@example.com",
    phone: "21436587",
    address: "test address",
    role: 1,
};

describe('Integrating Admin View Users Page, AdminRoute and the different Providers', () => { // Leong Soon Mun Stephane, A0273409B
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should display users if user is authenticated and is an admin", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem("cart", JSON.stringify({}));
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: { _id: "a2", name: "Admin Tester" },
                token: "valid-token",
            })
        );
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/admin-auth") {
                return Promise.resolve({ data: { ok: true } });
            }
            if (url === "/api/v1/auth/all-users") {
                return Promise.resolve({
                    data: [user1, users2, normalUser, adminUser],
                });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/admin/users"]}>
                            <Routes>
                                <Route path="/dashboard" element={<AdminRoute />}>
                                    <Route path="admin/users" element={<Users />} />
                                </Route>
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-users"));
        
        // Bob
        await waitFor(() => { expect(screen.getByText("Bob")).toBeInTheDocument() });
        expect(screen.getByText("bob@example.com")).toBeInTheDocument();
        expect(screen.getByText("12345678")).toBeInTheDocument();
        expect(screen.getByText("bob address")).toBeInTheDocument();

        // Charlie
        expect(screen.getByText("Charlie")).toBeInTheDocument();
        expect(screen.getByText("charlie@example.com")).toBeInTheDocument();
        expect(screen.getByText("12348765")).toBeInTheDocument();
        expect(screen.getByText("charlie address")).toBeInTheDocument();

        // Alice
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("alice@example.com")).toBeInTheDocument();
        expect(screen.getByText("87654321")).toBeInTheDocument();
        expect(screen.getByText("alice address")).toBeInTheDocument();

        // Tester
        expect(screen.getByText("Tester")).toBeInTheDocument();
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
        expect(screen.getByText("21436587")).toBeInTheDocument();
        expect(screen.getByText("test address")).toBeInTheDocument();

        expect(screen.getAllByRole("cell", { name: "Admin" })).toHaveLength(2);
        expect(screen.getAllByRole("cell", { name: "User" })).toHaveLength(2);
    });


    it("should redirect to spinner if user is not authenticated", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem("cart", JSON.stringify({}));
        localStorage.setItem("auth", JSON.stringify({}));
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/admin-auth") {
                return Promise.resolve({ data: { ok: true } });
            }
            if (url === "/api/v1/auth/all-users") {
                return Promise.resolve({
                    data: [user1, users2, normalUser, adminUser],
                });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });


        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/admin/users"]}>
                            <Routes>
                                <Route path="/dashboard" element={<AdminRoute />}>
                                    <Route path="admin/users" element={<Users />} />
                                </Route>
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).not.toHaveBeenCalledWith("/api/v1/auth/all-users"));
        await waitFor(() => {
            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });

    });

    it("should redirect to spinner if user is authenticated but is not an admin", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem("cart", JSON.stringify({}));
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: { _id: "a2", name: "Admin Tester" },
                token: "valid-token",
            })
        );
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/admin-auth") {
                return Promise.resolve({ data: { ok: false } });
            }
            if (url === "/api/v1/auth/all-users") {
                return Promise.resolve({
                    data: [user1, users2, normalUser, adminUser],
                });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/admin/users"]}>
                            <Routes>
                                <Route path="/dashboard" element={<AdminRoute />}>
                                    <Route path="admin/users" element={<Users />} />
                                </Route>
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).not.toHaveBeenCalledWith("/api/v1/auth/all-users"));
        await waitFor(() => {
            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });
    });

    it("should not display users if user is authenticated and is an admin but get call is rejected", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem("cart", JSON.stringify({}));
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: { _id: "a2", name: "Admin Tester" },
                token: "valid-token",
            })
        );
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/admin-auth") {
                return Promise.resolve({ data: { ok: true } });
            }
            if (url === "/api/v1/auth/all-users") {
                return Promise.reject("axios get error");
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/admin/users"]}>
                            <Routes>
                                <Route path="/dashboard" element={<AdminRoute />}>
                                    <Route path="admin/users" element={<Users />} />
                                </Route>
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-users"));
        await waitFor(() => expect(logSpy).toHaveBeenCalledWith('axios get error'));
        logSpy.mockRestore()
    });
});