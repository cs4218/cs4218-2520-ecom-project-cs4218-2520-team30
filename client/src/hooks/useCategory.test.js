import { renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import useCategory from './useCategory';

jest.mock('axios');

describe('useCategory hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls axios.get with the category API endpoint and returns data', async () => {
    // ARRANGE
    const mockCategories = [{ _id: '1', name: 'Shoes', slug: 'shoes' }];
    axios.get.mockResolvedValue({ data: { category: mockCategories } });

    // ACT
    const { result } = renderHook(() => useCategory());

    // ASSERT: use waitFor because the effect runs asynchronously
    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
    });
    expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
    expect(result.current).toEqual(mockCategories);
  });

  it('returns empty array initially and after API returns empty category', async () => {
    // ARRANGE
    axios.get.mockResolvedValue({ data: { category: [] } });

    // ACT
    const { result } = renderHook(() => useCategory());

    // ASSERT
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
    });
    expect(result.current).toEqual([]);
  });
});
