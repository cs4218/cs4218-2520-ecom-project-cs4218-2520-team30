import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

describe('Footer Component', () => {
  it('renders footer text with All Rights Reserved and TestingComp', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    expect(screen.getByText(/All Rights Reserved/)).toBeInTheDocument();
    expect(screen.getByText(/TestingComp/)).toBeInTheDocument();
  });

  it('renders navigation links for About, Contact, and Privacy Policy', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /About/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contact/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Privacy Policy/i })).toBeInTheDocument();
  });
});
