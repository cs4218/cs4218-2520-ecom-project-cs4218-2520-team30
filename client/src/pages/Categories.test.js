import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Categories from './Categories';
import useCategory from '../hooks/useCategory';

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

jest.mock('../hooks/useCategory', () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

jest.mock('../components/Form/SearchInput', () => function MockSearchInput() {
  return <div data-testid="search-input" />;
});

describe('Categories Page', () => {
  it('renders a list of categories', () => {
    // ARRANGE
    const mockCategories = [
      { _id: '1', name: 'Shoes', slug: 'shoes' },
      { _id: '2', name: 'Electronics', slug: 'electronics' },
    ];
    useCategory.mockReturnValue(mockCategories);

    // ACT
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    // ASSERT: category names appear (Header also shows them via same mock; scope to main for page content)
    const main = screen.getByRole('main');
    expect(within(main).getByText('Shoes')).toBeInTheDocument();
    expect(within(main).getByText('Electronics')).toBeInTheDocument();
  });

  it('renders category links with correct href', () => {
    // ARRANGE
    useCategory.mockReturnValue([{ _id: '1', name: 'Shoes', slug: 'shoes' }]);

    // ACT
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    // ASSERT: scope to main so we get the Categories page link, not the Header dropdown link
    const main = screen.getByRole('main');
    const link = within(main).getByRole('link', { name: /Shoes/i });
    expect(link).toHaveAttribute('href', '/category/shoes');
  });
});
