import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import ForgotPassword from './ForgotPassword';

// Mocking axios.post
jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

jest.mock('../../hooks/useCategory', () => ({
    __esModule: true,
    default: jest.fn(() => [])
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

describe('ForgotPassword Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    //Tay Kai Jun, A0283343E
    test('should render forgot password form with all elements', () => {
        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter>
                <ForgotPassword />
            </MemoryRouter>
        );

        expect(getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
        expect(getByPlaceholderText('What is Your Favorite Sport')).toBeInTheDocument();
        expect(getByPlaceholderText('Enter Your New Password')).toBeInTheDocument();
        expect(getByText('RESET PASSWORD')).toBeInTheDocument();
        expect(getByText('RESET')).toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
    test('should update email state on input change', () => {
        const { getByPlaceholderText } = render(
            <MemoryRouter>
                <ForgotPassword />
            </MemoryRouter>
        );

        const emailInput = getByPlaceholderText('Enter Your Email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        expect(emailInput.value).toBe('test@example.com');
    });

    //Tay Kai Jun, A0283343E
    test('should update answer state on input change', () => {
        const { getByPlaceholderText } = render(
            <MemoryRouter>
                <ForgotPassword />
            </MemoryRouter>
        );

        const answerInput = getByPlaceholderText('What is Your Favorite Sport');
        fireEvent.change(answerInput, { target: { value: 'football' } });
        expect(answerInput.value).toBe('football');
    });

    //Tay Kai Jun, A0283343E
    test('should update newPassword state on input change', () => {
        const { getByPlaceholderText } = render(
            <MemoryRouter>
                <ForgotPassword />
            </MemoryRouter>
        );

        const passwordInput = getByPlaceholderText('Enter Your New Password');
        fireEvent.change(passwordInput, { target: { value: 'newpass123' } });
        expect(passwordInput.value).toBe('newpass123');
    });

    describe('Email Format Validation', () => {
        //Tay Kai Jun, A0283343E
        test('should show error for invalid email format (no @ symbol)', async () => {
            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'invalidemail.com' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'football' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'password123' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Please enter a valid email format');
            });
            expect(axios.post).not.toHaveBeenCalled();
        });

        //Tay Kai Jun, A0283343E
        test('should show error for invalid email format (no domain)', async () => {
            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'football' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'password123' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Please enter a valid email format');
            });
            expect(axios.post).not.toHaveBeenCalled();
        });

        //Tay Kai Jun, A0283343E
        test('should show error for invalid email format (no local part)', async () => {
            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: '@example.com' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'football' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'password123' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Please enter a valid email format');
            });
            expect(axios.post).not.toHaveBeenCalled();
        });
    });

    describe('Password Length Validation', () => {
        //Tay Kai Jun, A0283343E
        test('should show error when password is less than 6 characters', async () => {
            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'football' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'pass1' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters long');
            });
            expect(axios.post).not.toHaveBeenCalled();
        });

        //Tay Kai Jun, A0283343E
        test('should accept password with exactly 6 characters', async () => {
            axios.post.mockResolvedValue({
                data: { success: true, message: 'Password reset successfully' }
            });

            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'football' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'pass12' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
                    email: 'test@example.com',
                    answer: 'football',
                    newPassword: 'pass12',
                });
            });
        });
    });

    describe('Wrong Email or Answer', () => {
        //Tay Kai Jun, A0283343E
        test('should show error when email or answer is wrong', async () => {
            axios.post.mockResolvedValue({
                data: { success: false, message: 'Wrong email or answer' }
            });

            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'wrong@example.com' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'wronganswer' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'newpass123' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Wrong email or answer');
            });
        });
    });

    describe('Successful Password Reset', () => {
        //Tay Kai Jun, A0283343E
        test('should reset password successfully and show success message', async () => {
            axios.post.mockResolvedValue({
                data: { success: true, message: 'Password reset successfully' }
            });

            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'football' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'newpass123' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
                    email: 'test@example.com',
                    answer: 'football',
                    newPassword: 'newpass123',
                });
                expect(toast.success).toHaveBeenCalledWith(
                    'Password reset successfully',
                    expect.objectContaining({
                        duration: 5000,
                        icon: '✅',
                        style: { background: 'green', color: 'white' }
                    })
                );
            });
        });

        //Tay Kai Jun, A0283343E
        test('should call API with correct parameters', async () => {
            axios.post.mockResolvedValue({
                data: { success: true, message: 'Password reset successfully' }
            });

            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'user@test.com' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'basketball' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'mynewpass' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
                    email: 'user@test.com',
                    answer: 'basketball',
                    newPassword: 'mynewpass',
                });
            });
        });
    });

    describe('Error Handling', () => {
        //Tay Kai Jun, A0283343E
        test('should handle server error during password reset', async () => {
            axios.post.mockRejectedValue({
                response: {
                    data: { message: 'Something went wrong' }
                }
            });

            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'football' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'password123' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Something went wrong');
            });
        });

        //Tay Kai Jun, A0283343E
        test('should handle network error during password reset', async () => {
            axios.post.mockRejectedValue({
                message: 'Network Error'
            });

            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'football' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'password123' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Something went wrong');
            });
        });
    });

    describe('Form Validation', () => {
        //Tay Kai Jun, A0283343E
        test('should validate email before password length', async () => {
            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'invalidemail' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'football' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'pass' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Please enter a valid email format');
            });
            expect(axios.post).not.toHaveBeenCalled();
        });

        //Tay Kai Jun, A0283343E
        test('should prevent form submission when validation fails', async () => {
            const { getByPlaceholderText, getByText } = render(
                <MemoryRouter>
                    <ForgotPassword />
                </MemoryRouter>
            );

            fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
            fireEvent.change(getByPlaceholderText('What is Your Favorite Sport'), { target: { value: 'football' } });
            fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: '12345' } });
            fireEvent.click(getByText('RESET'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters long');
            });
            expect(axios.post).not.toHaveBeenCalled();
        });
    });
});
