import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoryForm from './CategoryForm';

// ============================================================
// UNIT TESTS: CategoryForm Component
// ============================================================
describe('CategoryForm Component', () => {
    // ----------------------------------------------------------
    // RENDERING: Input field and submit button render correctly
    // ----------------------------------------------------------
    describe('Rendering', () => {
        it('should render input field with correct placeholder', () => {
            // Arrange
            const mockHandleSubmit = jest.fn();
            const mockSetValue = jest.fn();

            // Act
            render(
                <CategoryForm
                    handleSubmit={mockHandleSubmit}
                    value=""
                    setValue={mockSetValue}
                />
            );

            // Assert
            expect(screen.getByPlaceholderText('Enter new category')).toBeInTheDocument();
        });

        it('should render submit button', () => {
            // Arrange
            const mockHandleSubmit = jest.fn();
            const mockSetValue = jest.fn();

            // Act
            render(
                <CategoryForm
                    handleSubmit={mockHandleSubmit}
                    value=""
                    setValue={mockSetValue}
                />
            );

            // Assert
            expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
        });

        it('should display the provided value in the input field', () => {
            // Arrange
            const mockHandleSubmit = jest.fn();
            const mockSetValue = jest.fn();
            const testValue = 'Electronics';

            // Act
            render(
                <CategoryForm
                    handleSubmit={mockHandleSubmit}
                    value={testValue}
                    setValue={mockSetValue}
                />
            );

            // Assert
            expect(screen.getByPlaceholderText('Enter new category')).toHaveValue('Electronics');
        });
    });

    // ----------------------------------------------------------
    // INTERACTION: Typing into input calls setValue
    // ----------------------------------------------------------
    describe('Interaction', () => {
        it('should call setValue when typing into the input field', () => {
            // Arrange
            const mockHandleSubmit = jest.fn();
            const mockSetValue = jest.fn();

            render(
                <CategoryForm
                    handleSubmit={mockHandleSubmit}
                    value=""
                    setValue={mockSetValue}
                />
            );

            // Act
            const input = screen.getByPlaceholderText('Enter new category');
            fireEvent.change(input, { target: { value: 'Books' } });

            // Assert
            expect(mockSetValue).toHaveBeenCalledWith('Books');
        });

        it('should call setValue with updated value on each keystroke', () => {
            // Arrange
            const mockHandleSubmit = jest.fn();
            const mockSetValue = jest.fn();

            render(
                <CategoryForm
                    handleSubmit={mockHandleSubmit}
                    value=""
                    setValue={mockSetValue}
                />
            );

            // Act
            const input = screen.getByPlaceholderText('Enter new category');
            fireEvent.change(input, { target: { value: 'C' } });
            fireEvent.change(input, { target: { value: 'Cl' } });
            fireEvent.change(input, { target: { value: 'Clo' } });

            // Assert
            expect(mockSetValue).toHaveBeenCalledTimes(3);
            expect(mockSetValue).toHaveBeenNthCalledWith(1, 'C');
            expect(mockSetValue).toHaveBeenNthCalledWith(2, 'Cl');
            expect(mockSetValue).toHaveBeenNthCalledWith(3, 'Clo');
        });
    });

    // ----------------------------------------------------------
    // SUBMISSION: Clicking submit calls handleSubmit
    // ----------------------------------------------------------
    describe('Submission', () => {
        it('should call handleSubmit when form is submitted', () => {
            // Arrange
            const mockHandleSubmit = jest.fn((e) => e.preventDefault());
            const mockSetValue = jest.fn();

            render(
                <CategoryForm
                    handleSubmit={mockHandleSubmit}
                    value="Test Category"
                    setValue={mockSetValue}
                />
            );

            // Act
            const submitButton = screen.getByRole('button', { name: /submit/i });
            fireEvent.click(submitButton);

            // Assert
            expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
        });

        it('should call handleSubmit with event object when submitted', () => {
            // Arrange
            const mockHandleSubmit = jest.fn((e) => e.preventDefault());
            const mockSetValue = jest.fn();

            render(
                <CategoryForm
                    handleSubmit={mockHandleSubmit}
                    value="Electronics"
                    setValue={mockSetValue}
                />
            );

            // Act
            const form = screen.getByRole('button', { name: /submit/i }).closest('form');
            fireEvent.submit(form);

            // Assert
            expect(mockHandleSubmit).toHaveBeenCalled();
            expect(mockHandleSubmit.mock.calls[0][0]).toHaveProperty('preventDefault');
        });
    });
});
