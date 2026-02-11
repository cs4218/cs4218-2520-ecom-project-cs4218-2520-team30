import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Orders from './Orders';

// Mocking axios.post
jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(() => [{
        token: true,
    }, jest.fn()])
}));

jest.mock('../../hooks/useCategory', () => ({
    __esModule: true,
    default: jest.fn(() => []),
}));

jest.mock('../../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));


jest.mock('../../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
}));

Object.defineProperty(window, 'localStorage', {
    value: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
    },
    writable: true,
});

window.matchMedia = window.matchMedia || function () {
    return {
        matches: false,
        addListener: function () { },
        removeListener: function () { }
    };
};

describe('Order Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders orders table with headers', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: [{
                _id: 1,
                products: [
                    {
                        _id: 1,
                        name: 'product 1',
                        description: 'product 1 description'
                    },
                    {
                        _id: 2,
                        name: 'product 2',
                        description: 'product 2 description'
                    },
                ],
                payment: {
                    success: true,
                },
                buyer: {
                    name: "Stephane"
                },
                status: false,
                createdAt: null
            }]
        });


        // Act
        render(
            <MemoryRouter initialEntries={['/orders']}>
                <Routes>
                    <Route path="/orders" element={<Orders />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => expect(axios.get).toHaveBeenCalled());
        expect(screen.getByText('All Orders')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('#')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Status')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Buyer')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Date')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Payment')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Quantity')).toBeInTheDocument();
        });
    });
});
