// Leong Soon Mun Stephane, A0273409B
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Dashboard from "./Dashboard";
import Orders from "./Orders";
import Profile from "./Profile";
import PrivateRoute from "../../components/Routes/Private";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

global.React = React;

describe("Integrating Dashboard Page, UserMenu, PrivateRoute with the different Providers", () => { // Leong Soon Mun Stephane, A0273409B

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: {
                    _id: "u1",
                    name: "Alice",
                    address: "Alice address",
                    email: "alice@example.com",
                    phone: "87654321"
                },
                token: "valid-token",
            })
        );
        localStorage.setItem("cart", JSON.stringify({}));
    });

    it("should render all the UserMenu", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user"]}>
                            <Routes>
                                <Route path="/dashboard/user" element={<Dashboard />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Orders')).toBeInTheDocument();
    });

    it("should render Orders Page page on UserMenu click", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/orders") {
                return Promise.resolve({ data: [], });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user"]}>
                            <Routes>
                                <Route path="/dashboard/user" element={<Dashboard />} />
                                <Route path="/dashboard/user/orders" element={<Orders />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );
        fireEvent.click(screen.getByText('Orders'));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });
        expect(screen.getByRole("heading", { level: 1, name: "All Orders" })).toBeInTheDocument();
    });

    it("should render Profile Page page on UserMenu click", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: {
                    _id: "u1",
                    name: "Alice",
                    address: "Alice address",
                    email: "Alice@example.com",
                    phone: '12345678',
                },
                token: "valid-token",
            })
        );
        localStorage.setItem("cart", JSON.stringify({}));
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/orders") {
                return Promise.resolve({ data: [], });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user"]}>
                            <Routes>
                                <Route path="/dashboard/user" element={<Dashboard />} />
                                <Route path="/dashboard/user/profile" element={<Profile />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );
        fireEvent.click(screen.getByText('Profile'));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });
        expect(screen.getByRole("heading", { level: 4, name: "USER PROFILE" })).toBeInTheDocument();
    });

    it("should redirect to spinner if user is not authenticated", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/user-auth") {
                return Promise.resolve({ data: { ok: false } });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user"]}>
                            <Routes>
                                <Route path="/dashboard" element={<PrivateRoute />}>
                                    <Route path="user" element={<Dashboard />} />
                                </Route>
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
        });
        await waitFor(() => {
            expect(axios.get).not.toHaveBeenCalledWith("/api/v1/category/get-category");
        });
        await waitFor(() => {
            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });
    })


    it("should render user auth information on dashboard", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/user-auth") {
                return Promise.resolve({ data: { ok: true } });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user"]}>
                            <Routes>
                                <Route path="/dashboard" element={<PrivateRoute />}>
                                    <Route path="user" element={<Dashboard />} />
                                    <Route path="user/orders" element={<Orders />} />
                                    <Route path="user/orders" element={<Profile />} />

                                </Route>
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });
        expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Alice address" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "alice@example.com" })).toBeInTheDocument();
    });
});
