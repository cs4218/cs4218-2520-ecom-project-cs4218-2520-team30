// Leong Soon Mun Stephane, A0273409B
import { jest, describe, beforeEach, it, expect, afterEach } from "@jest/globals";
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import { useAuth } from '../../context/auth';
import Dashboard from "./Dashboard";

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn()
}));

jest.mock("../../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

jest.mock("../../components/UserMenu", () => ({
    __esModule: true,
    default: () => <div data-testid="user-menu">UserMenu</div>,
}));

describe('Dashboard Page', () => { // Leong Soon Mun Stephane, A0273409B

    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should display user information if auth returns user', () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let mockUser = {
            name: 'tester',
            email: 'tester@gmail.com',
            address: 'tester-address'
        }
        useAuth.mockReturnValue([{ user: mockUser }, jest.fn()]);

        // Act
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        )

        // Assert
        expect(screen.getByText('tester')).toBeInTheDocument();
        expect(screen.getByText('tester@gmail.com')).toBeInTheDocument();
        expect(screen.getByText('tester-address')).toBeInTheDocument();
    });

    it('should not display user information if auth user has missing data', () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let mockUser = {}
        useAuth.mockReturnValue([{ user: mockUser }, jest.fn()]);

        // Act
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        )

            // Assert
        let headings = screen.getAllByRole('heading', { level: 3 });
        headings.forEach((h3) => {
            expect(h3).toHaveTextContent('');
        });
        expect(screen.queryByText('tester')).not.toBeInTheDocument();
        expect(screen.queryByText('tester@gmail.com')).not.toBeInTheDocument();
        expect(screen.queryByText('tester-address')).not.toBeInTheDocument();
    });

    it('should render Layout and UserMenu', () => {  // Leong Soon Mun Stephane, A0273409B
        // Arrange

        // Act
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        )

        // Assert
        expect(screen.getByTestId('layout')).toBeInTheDocument();
        expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('should not display user information if if auth is missing user', () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        useAuth.mockReturnValue([{}, jest.fn()]);
        


        // Act
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        )

        // Assert
        let headings = screen.getAllByRole('heading', { level: 3 });
        headings.forEach((h3) => {
            expect(h3).toHaveTextContent('');
        });
        expect(screen.queryByText('tester')).not.toBeInTheDocument();
        expect(screen.queryByText('tester@gmail.com')).not.toBeInTheDocument();
        expect(screen.queryByText('tester-address')).not.toBeInTheDocument();
    });
});