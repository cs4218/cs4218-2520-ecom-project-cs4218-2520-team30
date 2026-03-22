// Leong Soon Mun Stephane, A0273409B
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Profile from "./Profile";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

window.matchMedia = window.matchMedia || function () {
    return {
        matches: false,
        addListener: function () { },
        removeListener: function () { }
    };
};

describe('Integrating Profile Page and the different Providers', () => { // Leong Soon Mun Stephane, A0273409B

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should populate placeholder with users data except password if user is authenticated", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: {
                    _id: "u1",
                    email: 'alice@example.com',
                    name: "Alice",
                    phone: '87654321',
                    address: 'alice address',
                },
                token: "valid-token",
            })
        );
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
                        <MemoryRouter initialEntries={["/dashboard/user/profile"]}>
                            <Routes>
                                <Route path="/dashboard/user/profile" element={<Profile />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"));
        expect(screen.getByPlaceholderText('Enter Your Name').value).toBe('Alice');
        expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('alice@example.com');
        expect(screen.getByPlaceholderText('Enter Your Password').value).toBe('');
        expect(screen.getByPlaceholderText('Enter Your Phone').value).toBe('87654321');
        expect(screen.getByPlaceholderText('Enter Your Address').value).toBe('alice address');

    });


    it("should show toast if put is successful", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: {
                    _id: "u1",
                    name: "Alice",
                    email: 'alice@example.com',
                    phone: '87654321',
                    address: 'alice address',
                },
                token: "valid-token",
            })
        );
        localStorage.setItem("cart", JSON.stringify({}));
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });
        axios.put.mockImplementation((url) => {
            if (url === "/api/v1/auth/profile") {
                return Promise.resolve({
                    data: {
                        name: "John Doe",
                        email: 'john@example.com',
                        phone: '1234567890',
                        address: '123 Street',
                    }
                });
            }
            return Promise.reject(new Error(`Unexpected PUT ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user/profile"]}>
                            <Routes>
                                <Route path="/dashboard/user/profile" element={<Profile />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );
        fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'john@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: '1234567890' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: '123 Street' } });
        fireEvent.click(screen.getByText('UPDATE'));

        // Assert
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
        await waitFor(() => { expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument() });
        expect(screen.getByPlaceholderText('Enter Your Name').value).toBe('John Doe');
        expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('john@example.com');
        expect(screen.getByPlaceholderText('Enter Your Password').value).toBe('password123');
        expect(screen.getByPlaceholderText('Enter Your Phone').value).toBe('1234567890');
        expect(screen.getByPlaceholderText('Enter Your Address').value).toBe('123 Street');
    });

    it("should show toast error message if put returns an error", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: {
                    _id: "u1",
                    name: "Alice",
                    email: 'alice@example.com',
                    phone: '87654321',
                    address: 'alice address',
                },
                token: "valid-token",
            })
        );
        localStorage.setItem("cart", JSON.stringify({}));
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });
        axios.put.mockImplementation((url) => {
            if (url === "/api/v1/auth/profile") {
                return Promise.resolve({ 
                    data: {
                        error: "Password is required and 6 character long"
                    }
                });
            }
            return Promise.reject(new Error(`Unexpected PUT ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user/profile"]}>
                            <Routes>
                                <Route path="/dashboard/user/profile" element={<Profile />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );
        fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: '12345' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: '1234567890' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: '123 Street' } });
        fireEvent.click(screen.getByText('UPDATE'));

        // Assert
        await waitFor(() => expect(axios.put).toHaveBeenCalled());

        await waitFor(() => { expect(screen.getByText("Password is required and 6 character long")).toBeInTheDocument() });
    });

    it("should show toast error message if put rejects", async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: {
                    _id: "u1",
                    name: "Alice",
                    email: 'alice@example.com',
                    phone: '87654321',
                    address: 'alice address',
                },
                token: "valid-token",
            })
        );
        localStorage.setItem("cart", JSON.stringify({}));
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { category: [] } });
            }
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });
        axios.put.mockImplementation((url) => {
            if (url === "/api/v1/auth/profile") {
                return Promise.reject({});
            }
            return Promise.reject(new Error(`Unexpected PUT ${url}`));
        });

        // Act
        render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={["/dashboard/user/profile"]}>
                            <Routes>
                                <Route path="/dashboard/user/profile" element={<Profile />} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );
        fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: '12345' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: '1234567890' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: '123 Street' } });
        fireEvent.click(screen.getByText('UPDATE'));

        // Assert
        await waitFor(() => { expect(screen.getByText("Something went wrong")).toBeInTheDocument() });
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
    });
});