// Leong Soon Mun Stephane, A0273409B
import React from 'react';
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { render, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Orders from './Orders';
import { useAuth } from '../../context/auth';

jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn()
}))

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

describe('Orders Page', () => { // Leong Soon Mun Stephane, A0273409B
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders orders table with headers', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        useAuth.mockReturnValue([{ token: 'token' }, jest.fn()]);
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
                    name: "Buyer 1"
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

    it('should throw error message if get fails', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        useAuth.mockReturnValue([{ token: 'token' }, jest.fn()]);
        axios.get.mockRejectedValueOnce('axios get error');
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });


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
        await waitFor(() => expect(logSpy).toHaveBeenCalledWith('axios get error'));
        logSpy.mockRestore()
    });

    it('renders orders table with Failed payment if payment success if false', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        useAuth.mockReturnValue([{ token: 'token' }, jest.fn()]);
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
                    success: false,
                },
                buyer: {
                    name: "Buyer 1"
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
        await waitFor(() => {
            expect(screen.getByText('Buyer 1')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('product 1')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('product 2')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('product 1 description')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('product 2 description')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Failed')).toBeInTheDocument();
        });
    });

    it('renders orders table with Success payment if payment success if true', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        useAuth.mockReturnValue([{ token: 'token' }, jest.fn()]);
        axios.get.mockResolvedValueOnce({
            data: [{
                _id: 1,
                products: [
                    {
                        _id: 1,
                        name: 'product 1',
                        description: 'product 1 description'
                    },
                ],
                payment: {
                    success: true,
                },
                buyer: {
                    name: "Buyer 1"
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
        await waitFor(() => {
            expect(screen.getByText('Buyer 1')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('product 1')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('product 1 description')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Success')).toBeInTheDocument();
        });
    });

    it('should not call get if token is invalid', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        useAuth.mockReturnValue([{}, jest.fn()]);

        // Act
        render(
            <MemoryRouter initialEntries={['/orders']}>
                <Routes>
                    <Route path="/orders" element={<Orders />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => expect(axios.get).not.toHaveBeenCalled());
    });
});
