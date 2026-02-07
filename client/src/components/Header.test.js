import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));

jest.mock('../hooks/useCategory', () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

jest.mock('./Form/SearchInput', () => function MockSearchInput() {
  return <div data-testid="search-input" />;
});

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const useAuth = require('../context/auth').useAuth;
const useCategory = require('../hooks/useCategory').default;

Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

const renderHeader = () => {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Register and Login when user is not logged in', () => {
    useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
    renderHeader();
    expect(screen.getByRole('link', { name: /Register/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Login/i })).toBeInTheDocument();
  });

  it('shows user name and Logout when user is logged in', () => {
    const setAuth = jest.fn();
    useAuth.mockReturnValue([
      { user: { name: 'Jane', role: 1 }, token: 'x' },
      setAuth,
    ]);
    renderHeader();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Logout/i })).toBeInTheDocument();
  });

  it('Dashboard link goes to admin when user role is 1', () => {
    useAuth.mockReturnValue([
      { user: { name: 'Admin', role: 1 }, token: 'x' },
      jest.fn(),
    ]);
    renderHeader();
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard/admin');
  });

  it('Dashboard link goes to user when user role is not 1', () => {
    useAuth.mockReturnValue([
      { user: { name: 'Bob', role: 0 }, token: 'x' },
      jest.fn(),
    ]);
    renderHeader();
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard/user');
  });

  it('Cart link is visible', () => {
    useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
    renderHeader();
    expect(screen.getByRole('link', { name: /Cart/i })).toBeInTheDocument();
  });

  it('renders category dropdown links when categories are returned', () => {
    // Arrange: mock auth as guest and useCategory with non-empty categories
    useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
    useCategory.mockReturnValue([
      { slug: 'electronics', name: 'Electronics' },
      { slug: 'books', name: 'Books' },
    ]);
    // Act: render the header
    renderHeader();
    // Assert: category links from the map are present
    expect(screen.getByRole('link', { name: /Electronics/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Books/i })).toBeInTheDocument();
  });

  it('calls setAuth and toast.success when Logout is clicked', () => {
    const setAuth = jest.fn();
    const toast = require('react-hot-toast').default;
    useAuth.mockReturnValue([
      { user: { name: 'Jane', role: 1 }, token: 'x' },
      setAuth,
    ]);
    renderHeader();
    fireEvent.click(screen.getByRole('link', { name: /Logout/i }));
    expect(setAuth).toHaveBeenCalledWith(
      expect.objectContaining({ user: null, token: '' })
    );
    expect(toast.success).toHaveBeenCalledWith('Logout Successfully');
  });
});
