import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Products from './Products';

// ============================================================
// MOCK EXTERNAL DEPENDENCIES (Isolation)
// ============================================================

// Mock axios for API calls
jest.mock('axios');
jest.mock('react-hot-toast');

// Mock context hooks
jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(() => [{ user: { name: 'Admin' }, token: 'mock-token' }, jest.fn()])
}));

jest.mock('../../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

// Mock useCategory hook to prevent Header axios calls
jest.mock('../../hooks/useCategory', () => jest.fn(() => []));

// Mock antd Badge component used by Header
jest.mock('antd', () => {
    const React = require('react');
    return {
        Badge: ({ children }) => React.createElement('span', null, children)
    };
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
    value: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
    },
    writable: true,
});

// Mock matchMedia for responsive components
window.matchMedia = window.matchMedia || function () {
    return {
        matches: false,
        addListener: function () { },
        removeListener: function () { }
    };
};

// ============================================================
// HELPER: Render component with router
// ============================================================
const renderProducts = () => {
    return render(
        <MemoryRouter initialEntries={['/dashboard/admin/products']}>
            <Routes>
                <Route path="/dashboard/admin/products" element={<Products />} />
            </Routes>
        </MemoryRouter>
    );
};

// Mock products data
const mockProducts = [
    { _id: 'prod-1', name: 'Product 1', slug: 'product-1', description: 'Description 1' },
    { _id: 'prod-2', name: 'Product 2', slug: 'product-2', description: 'Description 2' },
    { _id: 'prod-3', name: 'Product 3', slug: 'product-3', description: 'Description 3' }
];

// ============================================================
// TEST SUITE: Products Component
// ============================================================
describe('Products Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Renders products list page with title
    // ----------------------------------------------------------
    it('should render products list page with title', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { products: [] }
        });

        // Act
        renderProducts();

        // Assert
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /all products list/i })).toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Displays fetched products as cards
    // ----------------------------------------------------------
    it('should display fetched products with their details', async () => {
        // Arrange - mock all axios.get calls with URL matching
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/product/get-product') {
                return Promise.resolve({ data: { products: mockProducts } });
            }
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: [] } });
            }
            return Promise.resolve({ data: {} });
        });

        // Act
        renderProducts();

        // Assert
        await waitFor(() => {
            expect(screen.getByText('Product 1')).toBeInTheDocument();
        });
        expect(screen.getByText('Product 2')).toBeInTheDocument();
        expect(screen.getByText('Product 3')).toBeInTheDocument();
        expect(screen.getByText('Description 1')).toBeInTheDocument();
        expect(screen.getByText('Description 2')).toBeInTheDocument();
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Products have correct links
    // ----------------------------------------------------------
    it('should render product cards with correct navigation links', async () => {
        // Arrange - mock all axios.get calls with URL matching
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/product/get-product') {
                return Promise.resolve({ data: { products: mockProducts } });
            }
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: [] } });
            }
            return Promise.resolve({ data: {} });
        });

        // Act
        renderProducts();

        // Assert - wait for products to load then check links
        await waitFor(() => {
            expect(screen.getByText('Product 1')).toBeInTheDocument();
        });

        const productLinks = screen.getAllByRole('link').filter(
            link => link.getAttribute('href')?.includes('/dashboard/admin/product/')
        );
        expect(productLinks).toHaveLength(mockProducts.length);
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles API error on fetching products
    // ----------------------------------------------------------
    it('should display error toast when fetching products fails', async () => {
        // Arrange - mock product endpoint to reject, category to resolve
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/product/get-product') {
                return Promise.reject(new Error('Network error'));
            }
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: [] } });
            }
            return Promise.resolve({ data: {} });
        });

        // Act
        renderProducts();

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Someething Went Wrong');
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles empty products list gracefully
    // ----------------------------------------------------------
    it('should handle empty products list without errors', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { products: [] }
        });

        // Act
        renderProducts();

        // Assert
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /all products list/i })).toBeInTheDocument();
        });
        // Should not have any product-specific links (filter for product URLs)
        const allLinks = screen.getAllByRole('link');
        const productLinks = allLinks.filter(
            link => link.getAttribute('href')?.includes('/dashboard/admin/product/')
        );
        expect(productLinks).toHaveLength(0);
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Fetches products on component mount
    // ----------------------------------------------------------
    it('should fetch products from API on mount', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { products: mockProducts }
        });

        // Act
        renderProducts();

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/get-product');
        });
    });
});
