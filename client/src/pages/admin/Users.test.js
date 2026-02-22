// Leong Soon Mun Stephane, A0273409B
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Users from './Users';
import axios from "axios";

jest.mock('axios');

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()])
}));


jest.mock("../../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

jest.mock("../../components/AdminMenu", () => ({
    __esModule: true,
    default: () => <div data-testid="admin-menu">AdminMenu</div>,
}));

describe('User Component', () => { // Leong Soon Mun Stephane, A0273409B
    let res;
    beforeEach(() => {
        res = {
            data: {
                success: null,
                users: null,
            }
        }

        jest.clearAllMocks();
    });

    it('should render Layout and AdminMenu', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        res.data.success = true;
        res.data.users = []
        axios.get.mockResolvedValueOnce(res);

        // Act
        render(
            <MemoryRouter initialEntries={['/dashboard/admin/users']}>
                <Routes>
                    <Route path="/dashboard/admin/users" element={<Users />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => expect(axios.get).toBeCalledWith("/api/v1/auth/all-users"));
        expect(screen.getByTestId('layout')).toBeInTheDocument();
        expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
    });

    it('should render header and table', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        res.data.success = true;
        res.data.users = []
        axios.get.mockResolvedValueOnce(res);

        // Act
        render(
            <MemoryRouter initialEntries={['/dashboard/admin/users']}>
                <Routes>
                    <Route path="/dashboard/admin/users" element={<Users />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => expect(axios.get).toBeCalledWith("/api/v1/auth/all-users"));
        expect(screen.getByText('All Users')).toBeInTheDocument();
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Phone')).toBeInTheDocument();
        expect(screen.getByText('Address')).toBeInTheDocument();
        expect(screen.getByText('Role')).toBeInTheDocument();
    });

    it('should display admin role if role is 1', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        res.data.success = true;
        res.data.users = [
            {
                _id: 1,
                name: 'johndoe',
                email: 'johndoe@email.com',
                phone: '87654321',
                address: 'johndoe address',
                role: 1,
            },
        ]
        axios.get.mockResolvedValueOnce(res);

        // Act
        render(
            <MemoryRouter initialEntries={['/dashboard/admin/users']}>
                <Routes>
                    <Route path="/dashboard/admin/users" element={<Users />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => expect(axios.get).toBeCalledWith("/api/v1/auth/all-users"));
        await waitFor(() => {
            expect(screen.getByText('johndoe')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('johndoe@email.com')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('87654321')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('johndoe address')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Admin')).toBeInTheDocument();
        });
    });

    it('should display user role if role is not 1', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        res.data.success = true;
        res.data.users = [
            {
                _id: 2,
                name: 'johndoe',
                email: 'johndoe@email.com',
                phone: '87654321',
                address: 'johndoe address',
                role: 2,
            },
        ]
        axios.get.mockResolvedValueOnce(res);

        // Act
        render(
            <MemoryRouter initialEntries={['/dashboard/admin/users']}>
                <Routes>
                    <Route path="/dashboard/admin/users" element={<Users />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => expect(axios.get).toBeCalledWith("/api/v1/auth/all-users"));
        await waitFor(() => {
            expect(screen.getByText('johndoe')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('johndoe@email.com')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('87654321')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('johndoe address')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('User')).toBeInTheDocument();
        });
    });

    it('should not display user information if success if false', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        res.data.success = false;
        res.data.users = [
            {
                _id: 2,
                name: 'johndoe',
                email: 'johndoe@email.com',
                phone: '87654321',
                address: 'johndoe address',
                role: 2,
            },
        ]
        axios.get.mockResolvedValueOnce(res);

        // Act
        render(
            <MemoryRouter initialEntries={['/dashboard/admin/users']}>
                <Routes>
                    <Route path="/dashboard/admin/users" element={<Users />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => expect(axios.get).toBeCalledWith("/api/v1/auth/all-users"));        
        await waitFor(() => expect(screen.queryAllByRole('row').length).toBe(1)); // 1 for header
    });

    it('should log in console if get has an error', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let mockError = new Error('database connection error')
        axios.get.mockRejectedValueOnce(mockError);
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // Act
        render(
            <MemoryRouter initialEntries={['/dashboard/admin/users']}>
                <Routes>
                    <Route path="/dashboard/admin/users" element={<Users />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => expect(axios.get).toBeCalledWith("/api/v1/auth/all-users"));
        await waitFor(() => expect(logSpy).toHaveBeenCalledWith(mockError));
        logSpy.mockRestore()
    });
});
