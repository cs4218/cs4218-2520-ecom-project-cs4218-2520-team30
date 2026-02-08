import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import About from './About';

jest.mock('react-helmet', () => ({
  Helmet: () => null,
}));

jest.mock('react-hot-toast', () => ({
  Toaster: () => null,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [{ user: null, token: '' }, jest.fn()]),
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));

jest.mock('../hooks/useCategory', () => jest.fn(() => []));

jest.mock('../components/Form/SearchInput', () => function MockSearchInput() {
  return <div data-testid="search-input" />;
});

describe('About Page', () => {
  it('renders about page content with image and text', () => {
    // Arrange: render About inside MemoryRouter with Layout mocks
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    // Act: (none for static content)
    // Assert: key unique content exists
    expect(screen.getByAltText('contactus')).toBeInTheDocument();
    expect(screen.getByText('Add text')).toBeInTheDocument();
  });

  it('renders Layout with Header and Footer', () => {
    // Arrange: render About
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    // Assert: Layout-derived content is present
    expect(screen.getByText(/Virtual Vault/)).toBeInTheDocument();
    expect(screen.getByText(/All Rights Reserved/)).toBeInTheDocument();
  });
});
