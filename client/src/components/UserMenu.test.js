// Leong Soon Mun Stephane, A0273409B
import { jest, describe, it, expect } from "@jest/globals";
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from "react-router-dom";
import UserMenu from "./UserMenu";

describe('UserMenu Component', () => { // Leong Soon Mun Stephane, A0273409B


    it('should render all text elements if successful', () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange

        // Act
        render(
            <MemoryRouter>
                <UserMenu/>
            </MemoryRouter>
        )

        // Assert
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Orders')).toBeInTheDocument();
    })

    it('should render navLinks if successful', () => { // Leong Soon Mun Stephane, A0273409B
        // Arrange

        // Act
        render(
            <MemoryRouter>
                <UserMenu />
            </MemoryRouter>
        )

        // Assert
        let profileLink = screen.getByRole('link', { name: /profile/i });
        expect(profileLink).toHaveAttribute('href', '/dashboard/user/profile');
        let ordersLink = screen.getByRole('link', { name: /profile/i });
        expect(ordersLink).toHaveAttribute('href', '/dashboard/user/profile');       
    })
})