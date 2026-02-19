import React from 'react';
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Profile from './Profile';

// Mocking axios.post
jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(() => [{
        user: {
            email: 'test@example.com.sg',
            name: 'test',
            phone: '12345678',
            address: 'test address',
        }
    }, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../../hooks/useCategory', () => ({
    __esModule: true,
    default: jest.fn(() => []),
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

describe('Profile Component', () => { // Leong Soon Mun Stephane, A0273409B
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render update profile form', () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange

        // Act
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        expect(screen.getByText('USER PROFILE')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter Your Password')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter Your Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter Your Phone')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter Your Address')).toBeInTheDocument();
        expect(screen.getByText('UPDATE')).toBeInTheDocument();
    });

    it('should have initial inputs of user data except password', () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange

        // Act
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('test@example.com.sg');
        expect(screen.getByPlaceholderText('Enter Your Password').value).toBe('');
        expect(screen.getByPlaceholderText('Enter Your Name').value).toBe('test');
        expect(screen.getByPlaceholderText('Enter Your Phone').value).toBe('12345678');
        expect(screen.getByPlaceholderText('Enter Your Address').value).toBe('test address');

    });

    it('should update user detail if put is successful', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        axios.put.mockResolvedValueOnce({ data: {} });

        // Act
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: '1234567890' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: '123 Street' } });
        fireEvent.click(screen.getByText('UPDATE'));

        // Assert
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
        expect(toast.success).toHaveBeenCalledWith('Profile Updated Successfully');
    });

    it('should display error message if put returns an error', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        axios.put.mockResolvedValueOnce({ data: { error: 'error message' } });

        // Act
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: '1234567890' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: '123 Street' } });
        fireEvent.click(screen.getByText('UPDATE'));

        // Assert
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
        expect(toast.error).toHaveBeenCalledWith('error message');
    });

    it('should display error message if put call has an error', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let mockError = new Error('network connection error');
        let consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        axios.put.mockRejectedValueOnce(mockError);

        // Act
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: '1234567890' } });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: '123 Street' } });
        fireEvent.click(screen.getByText('UPDATE'));

        // Assert
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
        expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
        expect(toast.error).toHaveBeenCalledWith('Something went wrong');
        consoleLogSpy.mockRestore();
    });

});
