import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import AdminOrders from './AdminOrders';
import { useAuth } from '../../context/auth';

// ============================================================
// MOCK EXTERNAL DEPENDENCIES
// ============================================================

jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn()
}));

// Mock other contexts to prevent errors
jest.mock('../../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()])
}));
jest.mock('../../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));
jest.mock('../../hooks/useCategory', () => jest.fn(() => []));

// Mock AdminMenu to isolate tests to AdminOrders logic
jest.mock('../../components/AdminMenu', () => () => <div data-testid="admin-menu">AdminMenu</div>);

// Mock Layout to avoid clutter
jest.mock('../../components/Layout', () => ({ children, title }) => (
    <div data-testid="layout">
        <h1>{title}</h1>
        {children}
    </div>
));

// Mock moment
jest.mock('moment', () => {
    return () => ({
        fromNow: () => '2 days ago'
    });
});

// Mock antd Select
jest.mock('antd', () => {
    const React = require('react');
    const MockSelect = ({ children, onChange, defaultValue, bordered }) => {
        return (
            <select
                data-testid="status-select"
                onChange={(e) => onChange && onChange(e.target.value)}
                defaultValue={defaultValue}
            >
                {children}
            </select>
        );
    };
    MockSelect.Option = ({ children, value }) => {
        return <option value={value}>{children}</option>;
    };
    return {
        Select: MockSelect,
    };
});

// Mock Data
const mockOrders = [
    {
        _id: 'order-1',
        status: 'Not Process',
        buyer: { name: 'Buyer One' },
        createAt: '2023-01-01',
        payment: { success: true },
        products: [
            { _id: 'p1', name: 'Product A', description: 'Desc A', price: 100 },
        ]
    },
    {
        _id: 'order-2',
        status: 'Processing',
        buyer: { name: 'Buyer Two' },
        createAt: '2023-01-02',
        payment: { success: false },
        products: [
            { _id: 'p2', name: 'Product B', description: 'Desc B', price: 200 }
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
        // Setup default auth
        useAuth.mockReturnValue([{ user: { role: 1, name: 'Admin' }, token: 'valid-token' }, jest.fn()]);
    });

    // Helper to render
    const renderComponent = () => {
        render(
            <MemoryRouter>
                <AdminOrders />
            </MemoryRouter>
        );
    };

    /**
     * Test Case A: Empty State
     * Verify "No orders found" behavior or just empty list.
     * The component maps `orders?.map(...)`, so if empty, no tables should render.
     */
    // Alek Kwek, A0273471A
    it('Test Case A: Empty State - Renders no order tables when API returns empty array', async () => {
        axios.get.mockResolvedValueOnce({ data: [] });

        renderComponent();

        // Wait for potential async call
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/all-orders'));

        // Assert no tables are rendered
        const tables = screen.queryAllByRole('table');
        expect(tables).toHaveLength(0);

        // Assert Title is still there
        expect(screen.getByText('All Orders')).toBeInTheDocument();
    });

    /**
     * Test Case B: Populated State
     * Verify correct number of rows/cards render.
     */
    // Alek Kwek, A0273471A
    it('Test Case B: Populated State - Renders correct number of orders and products', async () => {
        // Use mockResolvedValue to ensure it persists across re-renders
        axios.get.mockResolvedValue({ data: mockOrders });

        renderComponent();

        // 1. Verify API Call
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/all-orders'));

        // 2. Verify Render
        // Should have 2 tables (one for each order)
        await waitFor(() => {
            const tables = screen.queryAllByRole('table');
            expect(tables).toHaveLength(2);
        });

        // Verify content
        expect(screen.getByText('Buyer One')).toBeInTheDocument();
        expect(screen.getByText('Buyer Two')).toBeInTheDocument();

        // Verify Products within orders
        expect(screen.getByText('Product A')).toBeInTheDocument();
        expect(screen.getByText('Product B')).toBeInTheDocument();

        // Verify Payment Status text
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    /**
     * Status Updates
     * Action: Change an Order Status dropdown
     * Expect: Verify axios.put call
     */
    // Alek Kwek, A0273471A
    it('Status Updates - Calls API when status is changed', async () => {
        axios.get.mockResolvedValueOnce({ data: mockOrders });
        axios.put.mockResolvedValueOnce({ data: { success: true } });

        renderComponent();

        await waitFor(() => expect(screen.getAllByTestId('status-select')).toHaveLength(2));

        const selects = screen.getAllByTestId('status-select');
        const firstSelect = selects[0]; // Corresponds to order-1 which is "Not Process"

        // Action: Change status to "Shipped"
        fireEvent.change(firstSelect, { target: { value: 'Shipped' } });

        // Expect: API call
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                `/api/v1/auth/order-status/order-1`,
                { status: 'Shipped' }
            );
        });

        // Implicitly checks that it re-fetches orders usually, but we mocked put.
        // The component calls `getOrders()` after update.
        // We can check if getOrders was called a second time?
        expect(axios.get).toHaveBeenCalledTimes(2); // Initial load + after update
    });

    /**
     * Test Case: API Failure - getOrders
     * Verify error handling when fetching orders fails.
     */
    // Alek Kwek, A0273471A
    it('Test Case: API Failure - getOrders logs error on failure', async () => {
        // Spy on console.log to verify error handling
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        axios.get.mockRejectedValue(new Error('Fetch failed'));

        renderComponent();

        await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/all-orders'));

        // Wait for the async operation to complete and log error
        // Since we cannot wait for a DOM change (nothing renders), we wait for the log
        await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error)));

        consoleSpy.mockRestore();
    });

    /**
     * Test Case: API Failure - handleChange
     * Verify error handling when updating status fails.
     */
    // Alek Kwek, A0273471A
    it('Test Case: API Failure - handleChange logs error on failure', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        axios.get.mockResolvedValue({ data: mockOrders });
        axios.put.mockRejectedValue(new Error('Update failed'));

        renderComponent();

        await waitFor(() => expect(screen.getAllByTestId('status-select')).toHaveLength(2));

        const selects = screen.getAllByTestId('status-select');
        const firstSelect = selects[0];

        // Action: Change status
        fireEvent.change(firstSelect, { target: { value: 'Shipped' } });

        await waitFor(() => expect(axios.put).toHaveBeenCalled());

        // Assert console.log was called with error
        await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error)));

        consoleSpy.mockRestore();
    });

    /**
     * Test Case: Auth Check
     * Verify that getOrders is NOT called if auth token is missing.
     * Covers the `if (auth?.token)` branch.
     */
    // Alek Kwek, A0273471A
    it('Test Case: Auth Check - does not fetch orders if no token', async () => {
        // Override useAuth for this test only
        useAuth.mockReturnValue([{ user: { role: 1, name: 'Admin' }, token: '' }, jest.fn()]);

        renderComponent();

        // Wait a bit to ensure useEffect would have run
        await new Promise(r => setTimeout(r, 100));

        expect(axios.get).not.toHaveBeenCalled();
    });
});
