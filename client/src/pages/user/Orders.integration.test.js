// Leong Soon Mun Stephane, A0273409B
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Orders from "./Orders";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Integrating Order Page and the different Providers', () => { // Leong Soon Mun Stephane, A0273409B
    beforeEach(() => {
        jest.clearAllMocks();
    });


    it("should display user's orders and payment success if user is authenticated and payment is succesful", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: { _id: "u1", name: "Alice" },
                token: "valid-token",
            })
        );
        localStorage.setItem("cart", JSON.stringify({}));

        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/orders") {
                return Promise.resolve({
                    data: [
                        {
                            _id: "o1",
                            status: "Not Process",
                            buyer: { name: "Alice" },
                            payment: { success: true },
                            products: [
                                {
                                    _id: "p1",
                                    name: "Mechanical Keyboard",
                                    description: "A clicky keyboard",
                                    price: 89.99,
                                },
                            ],
                        },
                    ],
                });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
                            <Routes>
                                <Route path="/dashboard/user/orders" element={<Orders />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders"));
        await waitFor(() => { expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("A clicky keyboard")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Price : 89.99")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Success")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Not Process")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByRole("cell", { name: "Alice" })).toBeInTheDocument() });
    });


    it("should display user's orders and payment failed if user is authenticated and payment is unsuccessful", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: { _id: "u1", name: "Alice" },
                token: "valid-token",
            })
        );
        localStorage.setItem("cart", JSON.stringify({}));


        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/orders") {
                return Promise.resolve({
                    data: [
                        {
                            _id: "o1",
                            status: "Not Process",
                            buyer: { name: "Alice" },
                            payment: { success: false },
                            products: [
                                {
                                    _id: "p1",
                                    name: "Mechanical Keyboard",
                                    description: "A clicky keyboard",
                                    price: 89.99,
                                },
                            ],
                        },
                    ],
                });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
                            <Routes>
                                <Route path="/dashboard/user/orders" element={<Orders />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders"));
        await waitFor(() => { expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("A clicky keyboard")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Price : 89.99")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Failed")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Not Process")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByRole("cell", { name: "Alice" })).toBeInTheDocument() });
    });

    it("should not display order table if user has no orders", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: { _id: "u1", name: "Alice" },
                token: "valid-token",
            })
        );
        localStorage.setItem("cart", JSON.stringify({}));


        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/orders") {
                return Promise.resolve({
                    data: [],
                });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
                            <Routes>
                                <Route path="/dashboard/user/orders" element={<Orders />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders"));
        await waitFor(() => {
            expect(screen.queryByText('#')).not.toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.queryByText('Status')).not.toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.queryByText('Buyer')).not.toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.queryByText('Date')).not.toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.queryByText('Payment')).not.toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.queryByText('Quantity')).not.toBeInTheDocument();
        });
    });


    it("should not display user's orders if user is authenticated but get is rejected", async () => { // Leong Soon Mun Stephane, A0273409B
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: { _id: "u1", name: "Alice" },
                token: "valid-token",
            })
        );
        localStorage.setItem("cart", JSON.stringify({}));


        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/orders") {
                return Promise.reject("axios get error");
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
                            <Routes>
                                <Route path="/dashboard/user/orders" element={<Orders />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders"));
        await waitFor(() => expect(logSpy).toHaveBeenCalledWith('axios get error'));
        logSpy.mockRestore()
    });

    it("should display 2 orders where one order has 2 products and the other with no products", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: { _id: "u1", name: "Alice" },
                token: "valid-token",
            })
        );
        localStorage.setItem("cart", JSON.stringify({}));

        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            if (url === "/api/v1/auth/orders") {
                return Promise.resolve({
                    data: [
                        {
                            _id: "o1",
                            status: "Shipped",
                            buyer: { name: "Alice" },
                            payment: { success: true },
                            products: [
                                {
                                    _id: "p1",
                                    name: "Mechanical Keyboard",
                                    description: "A clicky keyboard",
                                    price: 89.99,
                                },
                                {
                                    _id: "p2",
                                    name: "Wireless Mouse",
                                    description: "An ergonomic mouse",
                                    price: 45.99,
                                },
                            ],
                        },
                        {
                            _id: "o2",
                            status: "Not Process",
                            buyer: { name: "Alice" },
                            payment: { success: false },
                            products: [],
                        },
                    ],
                });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
                            <Routes>
                                <Route path="/dashboard/user/orders" element={<Orders />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders"));

        await waitFor(() => { expect(screen.getByText("Success")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Shipped")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("A clicky keyboard")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Price : 89.99")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Not Process")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Wireless Mouse")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("An ergonomic mouse")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Price : 45.99")).toBeInTheDocument() });

        await waitFor(() => { expect(screen.getByText("Failed")).toBeInTheDocument() });
        await waitFor(() => { expect(screen.getByText("Not Process")).toBeInTheDocument() });
        await waitFor(() => {
            expect(screen.getAllByText("Alice")).toHaveLength(3);
        });
    });

    it("should not display user's orders if user is not authenticated", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem("auth", JSON.stringify({}));
        localStorage.setItem("cart", JSON.stringify({}));

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
                        <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
                            <Routes>
                                <Route path="/dashboard/user/orders" element={<Orders />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).not.toHaveBeenCalledWith("/api/v1/auth/orders"));
    });
});
