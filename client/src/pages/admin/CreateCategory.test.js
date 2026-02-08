import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import CreateCategory from './CreateCategory';

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

// Mock antd Modal and Badge with proper React.createElement
jest.mock('antd', () => {
    const React = require('react');
    return {
        Modal: ({ children, visible, onCancel }) => {
            if (!visible) return null;
            return React.createElement('div', { 'data-testid': 'modal' },
                React.createElement('button', { onClick: onCancel, 'data-testid': 'modal-close' }, 'Close'),
                children
            );
        },
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
const renderCreateCategory = () => {
    return render(
        <MemoryRouter initialEntries={['/dashboard/admin/create-category']}>
            <Routes>
                <Route path="/dashboard/admin/create-category" element={<CreateCategory />} />
            </Routes>
        </MemoryRouter>
    );
};

// ============================================================
// TEST SUITE: CreateCategory Component
// ============================================================
describe('CreateCategory Component', () => {
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
    // HAPPY PATH: Renders create category page with form
    // ----------------------------------------------------------
    it('should render create category page with form and table', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: [] }
        });

        // Act
        renderCreateCategory();

        // Assert
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /manage category/i })).toBeInTheDocument();
        });
        expect(screen.getByPlaceholderText(/enter new category/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Creates category successfully
    // ----------------------------------------------------------
    it('should create category successfully and show success toast', async () => {
        // Arrange
        const newCategoryName = 'Electronics';
        axios.get.mockResolvedValue({
            data: { success: true, category: [] }
        });
        axios.post.mockResolvedValueOnce({
            data: { success: true, message: 'Category created' }
        });

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/enter new category/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText(/enter new category/i), {
            target: { value: newCategoryName }
        });
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));

        // Assert
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/v1/category/create-category', {
                name: newCategoryName
            });
        });
        expect(toast.success).toHaveBeenCalledWith(`${newCategoryName} is created`);
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Displays categories in table
    // ----------------------------------------------------------
    it('should display fetched categories in table', async () => {
        // Arrange - override beforeEach mock with categories
        const mockCategories = [
            { _id: '1', name: 'Electronics' },
            { _id: '2', name: 'Clothing' }
        ];
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });

        // Act
        renderCreateCategory();

        // Assert
        await waitFor(() => {
            expect(screen.getByText('Electronics')).toBeInTheDocument();
            expect(screen.getByText('Clothing')).toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles API error on category creation
    // ----------------------------------------------------------
    it('should display error toast when category creation fails', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: [] }
        });
        axios.post.mockRejectedValueOnce(new Error('Network error'));

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/enter new category/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText(/enter new category/i), {
            target: { value: 'Test Category' }
        });
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('something went wrong in input form');
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles API error on fetching categories
    // ----------------------------------------------------------
    it('should display error toast when fetching categories fails', async () => {
        // Arrange
        axios.get.mockRejectedValueOnce(new Error('Network error'));

        // Act
        renderCreateCategory();

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Something went wrong in getting category');
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Deletes category successfully
    // ----------------------------------------------------------
    it('should delete category successfully and refresh list', async () => {
        // Arrange - mock with category then empty after delete
        const mockCategories = [{ _id: '1', name: 'Electronics' }];
        let callCount = 0;
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
                callCount++;
                return callCount === 1
                    ? Promise.resolve({ data: { success: true, category: mockCategories } })
                    : Promise.resolve({ data: { success: true, category: [] } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.delete.mockResolvedValueOnce({
            data: { success: true }
        });

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByText('Electronics')).toBeInTheDocument();
        });

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        // Assert
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalledWith('/api/v1/category/delete-category/1');
        });
        expect(toast.success).toHaveBeenCalledWith('category is deleted');
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles delete failure
    // ----------------------------------------------------------
    it('should display error toast when category deletion fails', async () => {
        // Arrange - mock with category
        const mockCategories = [{ _id: '1', name: 'Electronics' }];
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.delete.mockRejectedValueOnce(new Error('Delete failed'));

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByText('Electronics')).toBeInTheDocument();
        });

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Something went wrong');
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Opens edit modal and updates category
    // ----------------------------------------------------------
    it('should open edit modal when edit button is clicked', async () => {
        // Arrange - override with category data
        const mockCategories = [{ _id: '1', name: 'Electronics' }];
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByText('Electronics')).toBeInTheDocument();
        });

        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);

        // Assert
        await waitFor(() => {
            expect(screen.getByTestId('modal')).toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Updates category successfully
    // ----------------------------------------------------------
    it('should update category successfully', async () => {
        // Arrange - mock with category, then updated after PUT
        const mockCategories = [{ _id: '1', name: 'Electronics' }];
        let callCount = 0;
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
                callCount++;
                return callCount === 1
                    ? Promise.resolve({ data: { success: true, category: mockCategories } })
                    : Promise.resolve({ data: { success: true, category: [{ _id: '1', name: 'Updated Electronics' }] } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.put.mockResolvedValueOnce({
            data: { success: true }
        });

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByText('Electronics')).toBeInTheDocument();
        });

        // Open modal
        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);

        await waitFor(() => {
            expect(screen.getByTestId('modal')).toBeInTheDocument();
        });

        // Find the input in modal and update
        const modalInputs = screen.getAllByPlaceholderText(/enter new category/i);
        const modalInput = modalInputs[modalInputs.length - 1]; // Get the modal's input
        fireEvent.change(modalInput, { target: { value: 'Updated Electronics' } });

        // Submit the modal form
        const submitButtons = screen.getAllByRole('button', { name: /submit/i });
        fireEvent.click(submitButtons[submitButtons.length - 1]);

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith('/api/v1/category/update-category/1', {
                name: 'Updated Electronics'
            });
        });
        expect(toast.success).toHaveBeenCalledWith('Updated Electronics is updated');
    });

    // ----------------------------------------------------------
    // EDGE CASE: Create category returns success: false
    // ----------------------------------------------------------
    it('should display error toast when create category returns success false', async () => {
        // Arrange
        axios.get.mockResolvedValue({
            data: { success: true, category: [] }
        });
        axios.post.mockResolvedValueOnce({
            data: { success: false, message: 'Category already exists' }
        });

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/enter new category/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText(/enter new category/i), {
            target: { value: 'Duplicate Category' }
        });
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Category already exists');
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Update category returns success: false
    // ----------------------------------------------------------
    it('should display error toast when update category returns success false', async () => {
        // Arrange
        const mockCategories = [{ _id: '1', name: 'Electronics' }];
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.put.mockResolvedValueOnce({
            data: { success: false, message: 'Update failed' }
        });

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByText('Electronics')).toBeInTheDocument();
        });

        // Open modal
        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);

        await waitFor(() => {
            expect(screen.getByTestId('modal')).toBeInTheDocument();
        });

        // Submit the modal form (uses existing value)
        const submitButtons = screen.getAllByRole('button', { name: /submit/i });
        fireEvent.click(submitButtons[submitButtons.length - 1]);

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Update failed');
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Update category throws error
    // ----------------------------------------------------------
    it('should display error toast when update category throws error', async () => {
        // Arrange
        const mockCategories = [{ _id: '1', name: 'Electronics' }];
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.put.mockRejectedValueOnce(new Error('Network error'));

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByText('Electronics')).toBeInTheDocument();
        });

        // Open modal
        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);

        await waitFor(() => {
            expect(screen.getByTestId('modal')).toBeInTheDocument();
        });

        // Submit the modal form
        const submitButtons = screen.getAllByRole('button', { name: /submit/i });
        fireEvent.click(submitButtons[submitButtons.length - 1]);

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Something went wrong');
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Delete category returns success: false
    // ----------------------------------------------------------
    it('should display error toast when delete category returns success false', async () => {
        // Arrange
        const mockCategories = [{ _id: '1', name: 'Electronics' }];
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.delete.mockResolvedValueOnce({
            data: { success: false, message: 'Cannot delete category' }
        });

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByText('Electronics')).toBeInTheDocument();
        });

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Cannot delete category');
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Close modal using onCancel
    // ----------------------------------------------------------
    it('should close modal when cancel button is clicked', async () => {
        // Arrange
        const mockCategories = [{ _id: '1', name: 'Electronics' }];
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });

        // Act
        renderCreateCategory();

        await waitFor(() => {
            expect(screen.getByText('Electronics')).toBeInTheDocument();
        });

        // Open modal
        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);

        await waitFor(() => {
            expect(screen.getByTestId('modal')).toBeInTheDocument();
        });

        // Close modal
        const closeButton = screen.getByTestId('modal-close');
        fireEvent.click(closeButton);

        // Assert - modal should be closed
        await waitFor(() => {
            expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: getAllCategory returns success: false
    // ----------------------------------------------------------
    it('should not set categories when getAllCategory returns success false', async () => {
        // Arrange - getAllCategory returns success: false
        axios.get.mockResolvedValueOnce({
            data: { success: false, message: 'Failed to get categories' }
        });

        // Act
        renderCreateCategory();

        // Assert - component should still render, no error toast
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /manage category/i })).toBeInTheDocument();
        });
        // Categories should remain empty (no setCategories call)
    });
});
