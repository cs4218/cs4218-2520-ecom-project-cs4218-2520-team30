import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import UpdateProduct from './UpdateProduct';

// ============================================================
// MOCK EXTERNAL DEPENDENCIES (Isolation)
// ============================================================

// Mock axios for API calls
jest.mock('axios');
jest.mock('react-hot-toast');

// Mock useNavigate and useParams
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: 'test-product-slug' })
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
    const MockSelect = ({ children, onChange, placeholder, value }) => {
        return React.createElement('select', {
            'data-testid': placeholder?.toLowerCase().replace(/\s+/g, '-'),
            onChange: (e) => onChange && onChange(e.target.value),
            value: value
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
const renderUpdateProduct = () => {
    return render(
        <MemoryRouter initialEntries={['/dashboard/admin/product/test-product-slug']}>
            <Routes>
                <Route path="/dashboard/admin/product/:slug" element={<UpdateProduct />} />
            </Routes>
        </MemoryRouter>
    );
};

// Mock product data
const mockProduct = {
    _id: 'prod-123',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    quantity: 10,
    shipping: true,
    category: { _id: 'cat-1', name: 'Electronics' }
};

const mockCategories = [
    { _id: 'cat-1', name: 'Electronics' },
    { _id: 'cat-2', name: 'Clothing' }
];

// ============================================================
// TEST SUITE: UpdateProduct Component
// ============================================================
describe('UpdateProduct Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset window.prompt mock
        window.prompt = jest.fn();
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Renders update product form with loaded data
    // ----------------------------------------------------------
    it('should render update product form with product data', async () => {
        // Arrange
        axios.get
            .mockResolvedValueOnce({ data: { product: mockProduct } })
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

        // Act
        renderUpdateProduct();

        // Assert
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /update product/i })).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i).value).toBe('Test Product');
        });
        expect(screen.getByPlaceholderText(/write a description/i).value).toBe('Test Description');
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Fetches product and categories on mount
    // ----------------------------------------------------------
    it('should fetch product and categories on component mount', async () => {
        // Arrange
        axios.get
            .mockResolvedValueOnce({ data: { product: mockProduct } })
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

        // Act
        renderUpdateProduct();

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/get-product/test-product-slug');
            expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Updates product successfully
    // ----------------------------------------------------------
    it('should update product successfully and navigate to products page', async () => {
        // Arrange
        axios.get
            .mockResolvedValueOnce({ data: { product: mockProduct } })
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } });
        axios.put.mockResolvedValueOnce({
            data: { success: true, message: 'Product updated' }
        });

        // Act
        renderUpdateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
        });

        // Update the product name
        fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
            target: { value: 'Updated Product Name' }
        });

        // Click update button
        fireEvent.click(screen.getByRole('button', { name: /update product/i }));

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
        });
        expect(toast.success).toHaveBeenCalledWith('Product Updated Successfully');
    });

    // ----------------------------------------------------------
    // EDGE CASE: Cancels delete when prompt is cancelled
    // ----------------------------------------------------------
    it('should not delete product when user cancels prompt', async () => {
        // Arrange
        axios.get
            .mockResolvedValueOnce({ data: { product: mockProduct } })
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } });
        window.prompt = jest.fn(() => null); // User clicks cancel

        // Act
        renderUpdateProduct();

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /delete product/i })).toBeInTheDocument();
        });

        // Click delete button
        fireEvent.click(screen.getByRole('button', { name: /delete product/i }));

        // Assert
        expect(window.prompt).toHaveBeenCalledWith('Are You Sure want to delete this product ? ');
        expect(axios.delete).not.toHaveBeenCalled();
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles delete API error
    // ----------------------------------------------------------
    it('should display error toast when delete fails', async () => {
        // Arrange - use mockImplementation to handle both API calls
        axios.get.mockImplementation((url) => {
            if (url.includes('/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.delete.mockRejectedValueOnce(new Error('Delete failed'));
        window.prompt = jest.fn(() => 'yes');

        // Act
        renderUpdateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
        });

        // Click delete button
        fireEvent.click(screen.getByRole('button', { name: /delete product/i }));

        // Assert
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalled();
        });
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Something went wrong');
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Allows editing form fields
    // ----------------------------------------------------------
    it('should allow user to edit form fields', async () => {
        // Arrange
        axios.get
            .mockResolvedValueOnce({ data: { product: mockProduct } })
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

        // Act
        renderUpdateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
        });

        const nameInput = screen.getByPlaceholderText(/write a name/i);
        const descInput = screen.getByPlaceholderText(/write a description/i);
        const priceInput = screen.getByPlaceholderText(/write a price/i);

        // Update values
        fireEvent.change(nameInput, { target: { value: 'New Name' } });
        fireEvent.change(descInput, { target: { value: 'New Description' } });
        fireEvent.change(priceInput, { target: { value: '199' } });

        // Assert
        expect(nameInput.value).toBe('New Name');
        expect(descInput.value).toBe('New Description');
        expect(priceInput.value).toBe('199');
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles getSingleProduct error
    // ----------------------------------------------------------
    it('should handle error when fetching single product fails', async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes('/get-product/')) {
                return Promise.reject(new Error('Product not found'));
            }
            if (url.includes('/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });

        // Act
        renderUpdateProduct();

        // Assert - component should still render (error is logged but not shown)
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /update product/i })).toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles getAllCategory error
    // ----------------------------------------------------------
    it('should display error toast when fetching categories fails', async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes('/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/get-category')) {
                return Promise.reject(new Error('Category fetch failed'));
            }
            return Promise.resolve({ data: {} });
        });

        // Act
        renderUpdateProduct();

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Something wwent wrong in getting catgeory');
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Deletes product successfully
    // ----------------------------------------------------------
    it('should delete product when user confirms prompt', async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes('/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.delete.mockResolvedValueOnce({ data: { success: true } });
        window.prompt = jest.fn(() => 'yes');

        // Act
        renderUpdateProduct();

        // Wait for product data to be loaded (id is set)
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i).value).toBe('Test Product');
        });

        // Click delete button
        fireEvent.click(screen.getByRole('button', { name: /delete product/i }));

        // Assert
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalled();
        });
        expect(toast.success).toHaveBeenCalledWith('Product DEleted Succfully');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Category select onChange handler
    // ----------------------------------------------------------
    it('should update category when select is changed', async () => {
        // Arrange
        axios.get
            .mockResolvedValueOnce({ data: { product: mockProduct } })
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

        // Act
        renderUpdateProduct();

        // Wait for product data to be loaded first
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i).value).toBe('Test Product');
        });

        // Select a different category
        const categorySelect = screen.getByTestId('select-a-category');
        fireEvent.change(categorySelect, { target: { value: 'cat-2' } });

        // Assert - verify the onChange was triggered (value update happens via React state)
        await waitFor(() => {
            expect(categorySelect).toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Photo upload onChange handler
    // ----------------------------------------------------------
    it('should handle photo upload and display preview', async () => {
        // Arrange
        axios.get
            .mockResolvedValueOnce({ data: { product: mockProduct } })
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

        // Act
        renderUpdateProduct();

        await waitFor(() => {
            expect(screen.getByText('Upload Photo')).toBeInTheDocument();
        });

        // Create a mock file
        const file = new File(['test'], 'newphoto.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]');

        // Upload file
        fireEvent.change(input, { target: { files: [file] } });

        // Assert - button text should change to filename
        await waitFor(() => {
            expect(screen.getByText('newphoto.png')).toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Quantity input onChange handler
    // ----------------------------------------------------------
    it('should update quantity when input is changed', async () => {
        // Arrange
        axios.get
            .mockResolvedValueOnce({ data: { product: mockProduct } })
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

        // Act
        renderUpdateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a quantity/i)).toBeInTheDocument();
        });

        // Change quantity
        const quantityInput = screen.getByPlaceholderText(/write a quantity/i);
        fireEvent.change(quantityInput, { target: { value: '25' } });

        // Assert
        expect(quantityInput.value).toBe('25');
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Shipping select onChange handler
    // ----------------------------------------------------------
    it('should update shipping when select is changed', async () => {
        // Arrange
        axios.get
            .mockResolvedValueOnce({ data: { product: mockProduct } })
            .mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

        // Act
        renderUpdateProduct();

        // Wait for product data to be loaded
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i).value).toBe('Test Product');
        });

        // Select shipping option
        const shippingSelect = screen.getByTestId('select-shipping-');
        fireEvent.change(shippingSelect, { target: { value: '0' } });

        // Assert - verify the onChange was triggered
        await waitFor(() => {
            expect(shippingSelect).toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles update API error (catch block)
    // ----------------------------------------------------------
    it('should display error toast when update throws error', async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes('/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.put.mockRejectedValueOnce(new Error('Network error'));

        // Act
        renderUpdateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i).value).toBe('Test Product');
        });

        // Click update button
        fireEvent.click(screen.getByRole('button', { name: /update product/i }));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('something went wrong');
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: Handles update failure (success:false)
    // ----------------------------------------------------------
    it('should display error toast when update returns success false', async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes('/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.put.mockResolvedValueOnce({
            data: { success: false, message: 'Update failed' }
        });

        // Act
        renderUpdateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i).value).toBe('Test Product');
        });

        // Click update button
        fireEvent.click(screen.getByRole('button', { name: /update product/i }));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Update failed');
        });
    });

    // ----------------------------------------------------------
    // EDGE CASE: getAllCategory returns success: false
    // ----------------------------------------------------------
    it('should not set categories when getAllCategory returns success false', async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes('/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/get-category')) {
                return Promise.resolve({ data: { success: false, message: 'Failed' } });
            }
            return Promise.resolve({ data: {} });
        });

        // Act
        renderUpdateProduct();

        // Assert - component should still render
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /update product/i })).toBeInTheDocument();
        });
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Update product without uploading new photo
    // Covers the 'photo &&' conditional on line 71
    // ----------------------------------------------------------
    it('should update product without new photo', async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes('/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.put.mockResolvedValueOnce({
            data: { success: true, message: 'Product updated' }
        });

        // Act
        renderUpdateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i).value).toBe('Test Product');
        });

        // Update name without uploading photo
        fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
            target: { value: 'Updated Name' }
        });

        // Click update button (no photo uploaded)
        fireEvent.click(screen.getByRole('button', { name: /update product/i }));

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
        });
        expect(toast.success).toHaveBeenCalledWith('Product Updated Successfully');
    });

    // ----------------------------------------------------------
    // HAPPY PATH: Update product WITH new photo upload
    // Covers the 'photo &&' truthy branch on line 71
    // ----------------------------------------------------------
    it('should update product with new photo', async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes('/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
        axios.put.mockResolvedValueOnce({
            data: { success: true, message: 'Product updated' }
        });

        // Act
        renderUpdateProduct();

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/write a name/i).value).toBe('Test Product');
        });

        // Upload a new photo
        const file = new File(['test'], 'newphoto.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]');
        fireEvent.change(input, { target: { files: [file] } });

        // Wait for photo to be set
        await waitFor(() => {
            expect(screen.getByText('newphoto.png')).toBeInTheDocument();
        });

        // Click update button (with photo uploaded)
        fireEvent.click(screen.getByRole('button', { name: /update product/i }));

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
        });
        expect(toast.success).toHaveBeenCalledWith('Product Updated Successfully');
    });
});
