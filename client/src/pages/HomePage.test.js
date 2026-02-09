import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import HomePage from './HomePage';

jest.mock('axios');

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

window.matchMedia = window.matchMedia || function () {
  return {
    matches: false,
    addListener: function () {},
    removeListener: function () {},
  };
};

describe('HomePage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/category/get-category')) {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url.includes('/api/v1/product/product-list/')) {
        return Promise.resolve({ data: { products: [] } });
      }
      if (url.includes('/api/v1/product/product-count')) {
        return Promise.resolve({ data: { total: 0 } });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
  });

  it('renders the homepage static elements successfully', async () => {
    // ARRANGE: mock API responses so the page loads without errors
    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // ASSERT: static text and layout present
    await waitFor(() => {
      expect(screen.getByText(/All Products/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Filter By Category/i)).toBeInTheDocument();
    expect(screen.getByAltText('bannerimage')).toBeInTheDocument();
  });

  it('fetches and displays products correctly', async () => {
    // ARRANGE: fake product data
    const mockProducts = [
      {
        _id: '1',
        name: 'Test Phone',
        price: 999,
        description: 'Great phone for testing',
        slug: 'test-phone',
      },
      {
        _id: '2',
        name: 'Test Laptop',
        price: 1999,
        description: 'Fast laptop for testing',
        slug: 'test-laptop',
      },
    ];

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/category/get-category')) {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url.includes('/api/v1/product/product-list/')) {
        return Promise.resolve({ data: { products: mockProducts } });
      }
      if (url.includes('/api/v1/product/product-count')) {
        return Promise.resolve({ data: { total: 2 } });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    // ACT
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // ASSERT: use waitFor because fetch is asynchronous
    await waitFor(() => {
      expect(screen.getByText('Test Phone')).toBeInTheDocument();
      expect(screen.getByText('Test Laptop')).toBeInTheDocument();
    });
    expect(screen.getByText('$999.00')).toBeInTheDocument();
    expect(screen.getByText('$1,999.00')).toBeInTheDocument();
  });
});
