import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import AdminOrders from './AdminOrders';
import { useAuth } from '../../context/auth';

// ============================================================
// MOCK EXTERNAL DEPENDENCIES (Isolation)
// ============================================================

// Mock axios for API calls
// Alek Kwek, A0273471A
jest.mock('axios');
jest.mock('react-hot-toast');

// Mock context hooks
jest.mock('../../context/auth', () => ({
    useAuth: jest.fn()
}));

jest.mock('../../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

// Mock useCategory hook to prevent Header axios calls
jest.mock('../../hooks/useCategory', () => jest.fn(() => []));

// Mock antd Select component with proper Option handling and Badge
jest.mock('antd', () => {
    const React = require('react');
    const MockSelect = ({ children, onChange, defaultValue }) => {
        return React.createElement('select', {
            'data-testid': 'status-select',
            onChange: (e) => onChange && onChange(e.target.value),
            defaultValue: defaultValue
        }, children);
    };
    MockSelect.Option = ({ children, value }) => {
        return React.createElement('option', { value }, children);
    };
    return {
        Select: MockSelect,
        Badge: ({ children }) => React.createElement('span', null, children)
    };
});

// Mock moment
jest.mock('moment', () => {
    return () => ({
        fromNow: () => '2 days ago'
    });
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
// Alek Kwek, A0273471A
const renderAdminOrders = () => {
    return render(
        <MemoryRouter initialEntries={['/dashboard/admin/orders']}>
            <Routes>
                <Route path="/dashboard/admin/orders" element={<AdminOrders />} />
            </Routes>
        </MemoryRouter>
    );
};

// Mock orders data
const mockOrders = [
    {
        _id: 'order-1',
        status: 'Processing',
        buyer: { name: 'John Doe' },
        createAt: '2024-01-15',
        payment: { success: true },
        products: [
            { _id: 'prod-1', name: 'Product 1', description: 'Test description for product 1', price: 99 }
        ]
    },
    {
        _id: 'order-2',
        status: 'Shipped',
        buyer: { name: 'Jane Smith' },
        createAt: '2024-01-16',
        payment: { success: false },
        products: [
            { _id: 'prod-2', name: 'Product 2', description: 'Test description for product 2', price: 149 }
        ]
    }
];

// ============================================================
// TEST SUITE: AdminOrders Component
// ============================================================
// Alek Kwek, A0273471A
describe('AdminOrders Component', () => {
    // Alek Kwek, A0273471A

    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock for useCategory hook API call
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: [] } });
            }
            return Promise.resolve({ data: {} });
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Renders all orders page with title
    // ----------------------------------------------------------
    // Alek Kwek, A0273471A

    it('should render all orders page with title', async () => {
        // Arrange
        useAuth.mockReturnValue([{ user: { name: 'Admin' }, token: 'mock-token' }, jest.fn()]);
        axios.get.mockResolvedValueOnce({ data: [] });

        // Act
        renderAdminOrders();

        // Assert
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /all orders/i })).toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Fetches orders when auth token is present
    // ----------------------------------------------------------
    // Alek Kwek, A0273471A

    it('should fetch orders when auth token is present', async () => {
        // Arrange
        useAuth.mockReturnValue([{ user: { name: 'Admin' }, token: 'valid-token' }, jest.fn()]);
        axios.get.mockResolvedValueOnce({ data: mockOrders });

        // Act
        renderAdminOrders();

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/all-orders');
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Does not fetch orders without token
    // ----------------------------------------------------------
    // Alek Kwek, A0273471A

    it('should not fetch orders when auth token is missing', async () => {
        // Arrange
        useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);

        // Act
        renderAdminOrders();

        // Assert
        await waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Displays order data in table
    // ----------------------------------------------------------
    // Alek Kwek, A0273471A

    it('should display order data in table', async () => {
        // Arrange
        useAuth.mockReturnValue([{ user: { name: 'Admin' }, token: 'valid-token' }, jest.fn()]);
        axios.get.mockResolvedValueOnce({ data: mockOrders });

        // Act
        renderAdminOrders();

        // Assert
        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Displays product information within orders
    // ----------------------------------------------------------
    // Alek Kwek, A0273471A

    it('should display product details within orders', async () => {
        // Arrange
        useAuth.mockReturnValue([{ user: { name: 'Admin' }, token: 'valid-token' }, jest.fn()]);
        axios.get.mockResolvedValueOnce({ data: mockOrders });

        // Act
        renderAdminOrders();

        // Assert
        await waitFor(() => {
            expect(screen.getByText('Product 1')).toBeInTheDocument();
            expect(screen.getByText('Product 2')).toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Updates order status when changed
    // ----------------------------------------------------------
    // Alek Kwek, A0273471A

    it('should update order status when select value changes', async () => {
        // Arrange
        useAuth.mockReturnValue([{ user: { name: 'Admin' }, token: 'valid-token' }, jest.fn()]);
        axios.get.mockResolvedValue({ data: mockOrders });
        axios.put.mockResolvedValueOnce({ data: { success: true } });

        // Act
        renderAdminOrders();

        await waitFor(() => {
            expect(screen.getAllByTestId('status-select')).toHaveLength(2);
        });

        // Change status of first order
        const selectElements = screen.getAllByTestId('status-select');
        fireEvent.change(selectElements[0], { target: { value: 'Shipped' } });

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith('/api/v1/auth/order-status/order-1', {
                status: 'Shipped'
            });
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles status update error gracefully
    // ----------------------------------------------------------
    // Alek Kwek, A0273471A

    it('should handle status update error gracefully', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        useAuth.mockReturnValue([{ user: { name: 'Admin' }, token: 'valid-token' }, jest.fn()]);
        axios.get.mockResolvedValue({ data: mockOrders });
        axios.put.mockRejectedValueOnce(new Error('Update failed'));

        // Act
        renderAdminOrders();

        await waitFor(() => {
            expect(screen.getAllByTestId('status-select')).toHaveLength(2);
        });

        // Change status of first order
        const selectElements = screen.getAllByTestId('status-select');
        fireEvent.change(selectElements[0], { target: { value: 'Shipped' } });

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });

        consoleSpy.mockRestore();
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Displays correct table headers
    // ----------------------------------------------------------
    // Alek Kwek, A0273471A

    it('should display correct table headers', async () => {
        // Arrange
        useAuth.mockReturnValue([{ user: { name: 'Admin' }, token: 'valid-token' }, jest.fn()]);
        axios.get.mockResolvedValueOnce({ data: mockOrders });

        // Act
        renderAdminOrders();

        // Assert
        await waitFor(() => {
            expect(screen.getAllByRole('columnheader', { name: /#/i })).toHaveLength(2);
            expect(screen.getAllByRole('columnheader', { name: /status/i })).toHaveLength(2);
            expect(screen.getAllByRole('columnheader', { name: /buyer/i })).toHaveLength(2);
            expect(screen.getAllByRole('columnheader', { name: /payment/i })).toHaveLength(2);
            expect(screen.getAllByRole('columnheader', { name: /quantity/i })).toHaveLength(2);
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles getOrders fetch error gracefully
    // ----------------------------------------------------------
    // Alek Kwek, A0273471A

    it('should handle getOrders fetch error gracefully', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        useAuth.mockReturnValue([{ user: { name: 'Admin' }, token: 'valid-token' }, jest.fn()]);
        axios.get.mockRejectedValueOnce(new Error('Failed to fetch orders'));

        // Act
        renderAdminOrders();

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });

        consoleSpy.mockRestore();
    });
});
