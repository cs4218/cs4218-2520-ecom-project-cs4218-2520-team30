// Leong Soon Mun Stephane, A0273409B
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import '@testing-library/jest-dom';
import PrivateRoute from './Private';
import { useAuth } from '../../context/auth';

jest.mock('axios');
global.React = React;

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn()
}));

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    Outlet: () => <div data-testid="outlet">Protected Content</div>
}));

jest.mock('../Spinner', () => ({
    __esModule: true,
    default: () => <div data-testid="spinner">Loading...</div>
}));


describe('Private Route', () => { // Leong Soon Mun Stephane, A0273409B
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should redirect to Spinner if auth has no token', () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        useAuth.mockReturnValue([{}, jest.fn()]);

        // Act
        render(
            <MemoryRouter>
                <PrivateRoute />
            </MemoryRouter>
        );

        // Assert
        expect(axios.get).not.toHaveBeenCalled();
        expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should redirect to Outlet if auth token is valid and response is ok', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        useAuth.mockReturnValue([{ token: true }, jest.fn()]);
        axios.get.mockResolvedValueOnce({ data: { ok: true } });

        // Act
        render(
            <MemoryRouter>
                <PrivateRoute />
            </MemoryRouter>
        );

        // Assert
        expect(axios.get).toHaveBeenCalled();
        expect(await screen.findByTestId('outlet')).toBeInTheDocument();
    });

    it('should redirect to Spinner if response ok is false', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        useAuth.mockReturnValue([{ token: true }, jest.fn()]);
        axios.get.mockResolvedValueOnce({ data: { ok: false } });

        // Act
        render(
            <MemoryRouter>
                <PrivateRoute />
            </MemoryRouter>
        );

        // Assert
        expect(axios.get).toHaveBeenCalled();
        expect(await screen.findByTestId('spinner')).toBeInTheDocument();
    });

    it('should redirect to Spinner if token is valid but get fails', async () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange
        let mockError = new Error("network error")
        let consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        useAuth.mockReturnValue([{ token: true }, jest.fn()]);
        axios.get.mockRejectedValueOnce(mockError);

        // Act
        render(
            <MemoryRouter>
                <PrivateRoute />
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => expect(axios.get).toHaveBeenCalled());
        expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
        expect(await screen.findByTestId('spinner')).toBeInTheDocument();
        consoleLogSpy.mockRestore()
    });
})