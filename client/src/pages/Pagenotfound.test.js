import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pagenotfound from './Pagenotfound';

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

describe('Pagenotfound Page', () => {
  it('renders 404 and Page Not Found text', () => {
    // Arrange: render Pagenotfound inside MemoryRouter with Layout mocks
    render(
      <MemoryRouter>
        <Pagenotfound />
      </MemoryRouter>
    );
    // Act: (none for static content)
    // Assert: key unique content exists
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
  });

  it('renders Go Back link to home', () => {
    // Arrange: render Pagenotfound
    render(
      <MemoryRouter>
        <Pagenotfound />
      </MemoryRouter>
    );
    // Assert: Go Back link exists and points to /
    const goBackLink = screen.getByRole('link', { name: /Go Back/i });
    expect(goBackLink).toBeInTheDocument();
    expect(goBackLink).toHaveAttribute('href', '/');
  });
});
