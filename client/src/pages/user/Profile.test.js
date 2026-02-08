import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Profile from './Profile';

// Mocking axios.post
jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(() => [{ user: {
        email: 'test@example.com.sg',
        name: 'test',
        phone: '12345678',
        address: 'test address',
    }
}, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
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
        getItem: jest.fn(() => ("{}")),
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

describe('Profile Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders update profile form', () => {
        // Arrange
        axios.get.mockRejectedValueOnce({ data: { category: [] } });

        // Act
        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        expect(getByText('USER PROFILE')).toBeInTheDocument();
        expect(getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
        expect(getByPlaceholderText('Enter Your Password')).toBeInTheDocument();
        expect(getByPlaceholderText('Enter Your Name')).toBeInTheDocument();
        expect(getByPlaceholderText('Enter Your Phone')).toBeInTheDocument();
        expect(getByPlaceholderText('Enter Your Address')).toBeInTheDocument();
        expect(getByText('UPDATE')).toBeInTheDocument();
    });

    it('initial inputs should set user data except password', () => {
        // Arrange
        axios.get.mockRejectedValueOnce({ data: { category: [] } });

        // Act
        const { getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        expect(getByPlaceholderText('Enter Your Email').value).toBe('test@example.com.sg');
        expect(getByPlaceholderText('Enter Your Password').value).toBe('');
        expect(getByPlaceholderText('Enter Your Name').value).toBe('test');
        expect(getByPlaceholderText('Enter Your Phone').value).toBe('12345678');
        expect(getByPlaceholderText('Enter Your Address').value).toBe('test address');
        
    });

    it('should update user detail successfully', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.put.mockResolvedValueOnce({ data: { } });
        

        // Act
        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Name'), { target: { value: 'John Doe' } });
        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.change(getByPlaceholderText('Enter Your Phone'), { target: { value: '1234567890' } });
        fireEvent.change(getByPlaceholderText('Enter Your Address'), { target: { value: '123 Street' } });
        fireEvent.click(getByText('UPDATE'));

        // Assert
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
        expect(toast.success).toHaveBeenCalledWith('Profile Updated Successfully');
    });

    it('should display error message on failed put', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.put.mockResolvedValueOnce({ data: { error: 'error message'} });


        // Act
        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Name'), { target: { value: 'John Doe' } });
        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.change(getByPlaceholderText('Enter Your Phone'), { target: { value: '1234567890' } });
        fireEvent.change(getByPlaceholderText('Enter Your Address'), { target: { value: '123 Street' } });
        fireEvent.click(getByText('UPDATE'));

        // Assert
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
        expect(toast.error).toHaveBeenCalledWith('error message');
    });

    it('should display error message on put error', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.put.mockRejectedValueOnce({ message: 'network connection error' });


        // Act
        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Name'), { target: { value: 'John Doe' } });
        fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.change(getByPlaceholderText('Enter Your Phone'), { target: { value: '1234567890' } });
        fireEvent.change(getByPlaceholderText('Enter Your Address'), { target: { value: '123 Street' } });
        fireEvent.click(getByText('UPDATE'));

        // Assert
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
        expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
    
});
