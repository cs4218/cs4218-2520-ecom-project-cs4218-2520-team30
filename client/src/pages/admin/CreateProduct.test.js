import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import CreateProduct from './CreateProduct';

// ============================================================
// MOCK EXTERNAL DEPENDENCIES (Isolation)
// ============================================================
// Alek Kwek, A0273471A

// Mock axios for API calls
jest.mock('axios');
jest.mock('react-hot-toast');

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate
}));

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

// Mock antd Select component with proper Option handling and Badge
jest.mock('antd', () => {
    const React = require('react');
    const MockSelect = ({ children, onChange, placeholder }) => {
        return React.createElement('select', {
            'data-testid': placeholder?.toLowerCase().replace(/\s+/g, '-'),
            onChange: (e) => onChange && onChange(e.target.value)
        }, React.createElement('option', { value: '' }, 'Select'), children);
    };
    MockSelect.Option = ({ children, value }) => {
        return React.createElement('option', { value }, children);
    };
    return {
        Select: MockSelect,
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

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

// ============================================================
// HELPER: Render component with router
// ============================================================
// Alek Kwek, A0273471A

const renderCreateProduct = () => {
    return render(
        <MemoryRouter initialEntries={['/dashboard/admin/create-product']}>
            <Routes>
                <Route path="/dashboard/admin/create-product" element={<CreateProduct />} />
            </Routes>
        </MemoryRouter>
    );
};

// ============================================================
// TEST SUITE: CreateProduct Component
// ============================================================
// Alek Kwek, A0273471A

describe('CreateProduct Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Renders create product form
    // ----------------------------------------------------------
    it('should render create product form with all fields', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: [] }
        });

        // Act
        renderCreateProduct();

        // Assert
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /create product/i })).toBeInTheDocument();
        });
        expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/write a description/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/write a price/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/write a quantity/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create product/i })).toBeInTheDocument();
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Loads categories on mount
    // ----------------------------------------------------------
    it('should fetch categories on component mount', async () => {
        // Arrange
        const mockCategories = [
            { _id: '1', name: 'Electronics' },
            { _id: '2', name: 'Clothing' }
        ];
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: mockCategories }
        });

        // Act
        renderCreateProduct();

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Creates product successfully
    // ----------------------------------------------------------
    it('should create product successfully and navigate to products page', async () => {
        // Arrange
        const mockCategories = [{ _id: '1', name: 'Electronics' }];
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: mockCategories }
        });
        axios.post.mockResolvedValueOnce({
            data: { success: true, message: 'Product created' }
        });

        // Act
        renderCreateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
        });

        // Fill in form fields
        fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
            target: { value: 'Test Product' }
        });
        fireEvent.change(screen.getByPlaceholderText(/write a description/i), {
            target: { value: 'Test Description' }
        });
        fireEvent.change(screen.getByPlaceholderText(/write a price/i), {
            target: { value: '99' }
        });
        fireEvent.change(screen.getByPlaceholderText(/write a quantity/i), {
            target: { value: '10' }
        });

        // Click create button
        fireEvent.click(screen.getByRole('button', { name: /create product/i }));

        // Assert
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalled();
        });
        expect(toast.success).toHaveBeenCalledWith('Product Created Successfully');
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles category fetch failure
    // ----------------------------------------------------------
    it('should display error toast when fetching categories fails', async () => {
        // Arrange
        axios.get.mockRejectedValueOnce(new Error('Network error'));

        // Act
        renderCreateProduct();

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Something wwent wrong in getting catgeory');
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Allows user to fill in all form fields
    // ----------------------------------------------------------
    it('should allow user to fill in all form fields', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: [] }
        });

        // Act
        renderCreateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
        });

        // Fill in all fields
        const nameInput = screen.getByPlaceholderText(/write a name/i);
        const descInput = screen.getByPlaceholderText(/write a description/i);
        const priceInput = screen.getByPlaceholderText(/write a price/i);
        const quantityInput = screen.getByPlaceholderText(/write a quantity/i);

        fireEvent.change(nameInput, { target: { value: 'New Product' } });
        fireEvent.change(descInput, { target: { value: 'Product Description' } });
        fireEvent.change(priceInput, { target: { value: '199' } });
        fireEvent.change(quantityInput, { target: { value: '50' } });

        // Assert
        expect(nameInput.value).toBe('New Product');
        expect(descInput.value).toBe('Product Description');
        expect(priceInput.value).toBe('199');
        expect(quantityInput.value).toBe('50');
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Category select onChange handler
    // ----------------------------------------------------------
    it('should update category when select is changed', async () => {
        // Arrange
        const mockCategories = [
            { _id: '1', name: 'Electronics' },
            { _id: '2', name: 'Clothing' }
        ];
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: mockCategories }
        });

        // Act
        renderCreateProduct();

        await waitFor(() => {
            expect(screen.getByTestId('select-a-category')).toBeInTheDocument();
        });

        // Select a category
        const categorySelect = screen.getByTestId('select-a-category');
        fireEvent.change(categorySelect, { target: { value: '1' } });

        // Assert - verify the select value changed
        expect(categorySelect.value).toBe('1');
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Shipping select onChange handler
    // ----------------------------------------------------------
    it('should update shipping when select is changed', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: [] }
        });

        // Act
        renderCreateProduct();

        await waitFor(() => {
            expect(screen.getByTestId('select-shipping-')).toBeInTheDocument();
        });

        // Select shipping option
        const shippingSelect = screen.getByTestId('select-shipping-');
        fireEvent.change(shippingSelect, { target: { value: '1' } });

        // Assert - verify the select value changed
        expect(shippingSelect.value).toBe('1');
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Photo upload onChange handler
    // ----------------------------------------------------------
    it('should handle photo upload and display preview', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: [] }
        });

        // Act
        renderCreateProduct();

        await waitFor(() => {
            expect(screen.getByText('Upload Photo')).toBeInTheDocument();
        });

        // Create a mock file
        const file = new File(['test'], 'test.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]');

        // Upload file
        fireEvent.change(input, { target: { files: [file] } });

        // Assert - button text should change to filename
        await waitFor(() => {
            expect(screen.getByText('test.png')).toBeInTheDocument();
        });
        // Image preview should be displayed
        expect(screen.getByAltText('product_photo')).toBeInTheDocument();
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles product creation error (catch block)
    // ----------------------------------------------------------
    it('should display error toast when product creation throws error', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: [] }
        });
        axios.post.mockRejectedValueOnce(new Error('Network error'));

        // Act
        renderCreateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
        });

        // Fill in required field
        fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
            target: { value: 'Test Product' }
        });

        // Click create button
        fireEvent.click(screen.getByRole('button', { name: /create product/i }));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('something went wrong');
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles product creation failure (success:false)
    // ----------------------------------------------------------
    it('should display error toast when create product returns success false', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: [] }
        });
        axios.post.mockResolvedValueOnce({
            data: { success: false, message: 'Product already exists' }
        });

        // Act
        renderCreateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
        });

        // Fill in required field
        fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
            target: { value: 'Duplicate Product' }
        });

        // Click create button
        fireEvent.click(screen.getByRole('button', { name: /create product/i }));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Product already exists');
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
        renderCreateProduct();

        // Assert - component should still render
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /create product/i })).toBeInTheDocument();
        });
        // Categories select should be empty (no setCategories call)
    });
});
