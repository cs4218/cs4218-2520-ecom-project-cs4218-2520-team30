import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Login from './Login';

// Mocking axios.post
jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
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

describe('Login Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    //Tay Kai Jun, A0283343E
    it('renders login form', () => {
        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        expect(getByText('LOGIN FORM')).toBeInTheDocument();
        expect(getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
        expect(getByPlaceholderText('Enter Your Password')).toBeInTheDocument();
    });
    //Tay Kai Jun, A0283343E
    it('inputs should be initially empty', () => {
        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        expect(getByText('LOGIN FORM')).toBeInTheDocument();
        expect(getByPlaceholderText('Enter Your Email').value).toBe('');
        expect(getByPlaceholderText('Enter Your Password').value).toBe('');
    });

    //Tay Kai Jun, A0283343E
    it('should allow typing email and password', () => {
        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );
        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        expect(getByPlaceholderText('Enter Your Email').value).toBe('test@example.com');
        expect(getByPlaceholderText('Enter Your Password').value).toBe('password123');
    });

    //Tay Kai Jun, A0283343E
    it('should login the user successfully', async () => {
        axios.post.mockResolvedValueOnce({
            data: {
                success: true,
                user: { id: 1, name: 'John Doe', email: 'test@example.com' },
                token: 'mockToken'
            }
        });

        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(axios.post).toHaveBeenCalled());
        expect(toast.success).toHaveBeenCalledWith(undefined, {
            duration: 5000,
            icon: '🙏',
            style: {
                background: 'green',
                color: 'white'
            }
        });
    });

    //Tay Kai Jun, A0283343E
    it('should display error message on failed login', async () => {
        axios.post.mockRejectedValueOnce({
            response: {
                data: {
                    message: 'Invalid email or password'
                }
            }
        });

        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'wrongpassword' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(axios.post).toHaveBeenCalled());
        expect(toast.error).toHaveBeenCalledWith('Invalid email or password');
    });

    //Tay Kai Jun, A0283343E
    it('should display error message when email or password is invalid', async () => {
        axios.post.mockRejectedValueOnce({
            response: {
                data: {
                    message: 'Invalid email or password'
                }
            }
        });

        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'unregistered@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(axios.post).toHaveBeenCalled());
        expect(toast.error).toHaveBeenCalledWith('Invalid email or password');
    });

    //Tay Kai Jun, A0283343E
    it('should display error message when password is too short (caught by frontend)', async () => {
        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'short' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters long'));
        expect(axios.post).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
    it('should display error message when server error occurs', async () => {
        axios.post.mockRejectedValueOnce({
            response: {
                data: {
                    message: 'Error in login'
                }
            }
        });

        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'validpassword123' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(axios.post).toHaveBeenCalled());
        expect(toast.error).toHaveBeenCalledWith('Error in login');
    });

    //Tay Kai Jun, A0283343E
    it('should display error when success is false in response', async () => {
        axios.post.mockResolvedValueOnce({
            data: {
                success: false,
                message: 'Login failed'
            }
        });

        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'validpass123' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(axios.post).toHaveBeenCalled());
        expect(toast.error).toHaveBeenCalledWith('Login failed');
    });

    //Tay Kai Jun, A0283343E
    it('should navigate to forgot password page when button is clicked', () => {
        const { getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.click(getByText('Forgot Password'));
        expect(getByText('Forgot Password Page')).toBeInTheDocument();
    });

    //Tay Kai Jun, A0283343E
    it('should display error when email format is invalid', async () => {
        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'invalidemail' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Email must be a valid format'));
        expect(axios.post).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
    it('should display error when password is less than 6 characters', async () => {
        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'short' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters long'));
        expect(axios.post).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
    it('should accept valid email and password with exactly 6 characters', async () => {
        axios.post.mockResolvedValueOnce({
            data: {
                success: true,
                user: { id: 1, name: 'John Doe', email: 'test@example.com' },
                token: 'mockToken'
            }
        });

        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'pass12' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(axios.post).toHaveBeenCalled());
        expect(toast.error).not.toHaveBeenCalledWith('Password must be at least 6 characters long');
    });

    //Tay Kai Jun, A0283343E
    it('should display error for email without domain', async () => {
        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Email must be a valid format'));
        expect(axios.post).not.toHaveBeenCalled();
    });

    //Tay Kai Jun, A0283343E
    it('should display error for email without @ symbol', async () => {
        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'testexample.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.click(getByText('LOGIN'));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Email must be a valid format'));
        expect(axios.post).not.toHaveBeenCalled();
    });
});
