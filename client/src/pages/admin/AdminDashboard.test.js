import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import AdminDashboard from './AdminDashboard';
import { useAuth } from '../../context/auth';

// ============================================================
// MOCK EXTERNAL DEPENDENCIES (Isolation)
// ============================================================

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
const renderAdminDashboard = () => {
    return render(
        <MemoryRouter initialEntries={['/dashboard/admin']}>
            <Routes>
                <Route path="/dashboard/admin" element={<AdminDashboard />} />
            </Routes>
        </MemoryRouter>
    );
};

// ============================================================
// TEST SUITE: AdminDashboard Component
// ============================================================
describe('AdminDashboard Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Renders admin dashboard with user information
    // ----------------------------------------------------------
    it('should render admin dashboard with user name, email, and phone', () => {
        // Arrange
        const mockAuth = {
            user: {
                name: 'John Admin',
                email: 'admin@example.com',
                phone: '1234567890'
            },
            token: 'mock-token'
        };
        useAuth.mockReturnValue([mockAuth, jest.fn()]);

        // Act
        renderAdminDashboard();

        // Assert
        expect(screen.getByRole('heading', { name: /admin name : john admin/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /admin email : admin@example.com/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /admin contact : 1234567890/i })).toBeInTheDocument();
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles missing user data gracefully
    // ----------------------------------------------------------
    it('should handle missing user data without crashing', () => {
        // Arrange
        useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);

        // Act
        renderAdminDashboard();

        // Assert - Component should render without throwing an error
        expect(screen.getByText(/admin name :/i)).toBeInTheDocument();
        expect(screen.getByText(/admin email :/i)).toBeInTheDocument();
        expect(screen.getByText(/admin contact :/i)).toBeInTheDocument();
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles partially missing user data
    // ----------------------------------------------------------
    it('should handle partially missing user data', () => {
        // Arrange
        const mockAuth = {
            user: {
                name: 'Partial Admin',
                email: undefined,
                phone: null
            },
            token: 'mock-token'
        };
        useAuth.mockReturnValue([mockAuth, jest.fn()]);

        // Act
        renderAdminDashboard();

        // Assert
        expect(screen.getByRole('heading', { name: /admin name : partial admin/i })).toBeInTheDocument();
        expect(screen.getByText(/admin email :/i)).toBeInTheDocument();
        expect(screen.getByText(/admin contact :/i)).toBeInTheDocument();
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Displays admin panel heading
    // ----------------------------------------------------------
    it('should display the admin dashboard layout correctly', () => {
        // Arrange
        const mockAuth = {
            user: {
                name: 'Test Admin',
                email: 'test@admin.com',
                phone: '9876543210'
            },
            token: 'mock-token'
        };
        useAuth.mockReturnValue([mockAuth, jest.fn()]);

        // Act
        renderAdminDashboard();

        // Assert
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
});
