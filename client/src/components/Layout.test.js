import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

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

jest.mock('./Form/SearchInput', () => function MockSearchInput() {
  return <div data-testid="search-input" />;
});

describe('Layout Component', () => {
  it('renders Header, Footer, and children', () => {
    render(
      <MemoryRouter>
        <Layout>
          <h1>Test Content</h1>
        </Layout>
      </MemoryRouter>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText(/Virtual Vault/)).toBeInTheDocument();
    expect(screen.getByText(/All Rights Reserved/)).toBeInTheDocument();
  });
});
