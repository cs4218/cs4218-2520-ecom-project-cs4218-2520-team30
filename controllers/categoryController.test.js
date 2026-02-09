import { categoryControlller, singleCategoryController } from './categoryController.js';
import categoryModel from '../models/categoryModel.js';

jest.mock('../models/categoryModel.js', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

describe('Category Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get all categories successfully', async () => {
    // ARRANGE
    const mockCategories = [{ name: 'Tech' }, { name: 'Health' }];
    categoryModel.find.mockResolvedValue(mockCategories);

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // ACT
    await categoryControlller(req, res);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'All Categories List',
      category: mockCategories,
    });
  });

  it('should get single category successfully', async () => {
    // ARRANGE
    const mockCategory = { name: 'Tech', slug: 'tech' };
    categoryModel.findOne.mockResolvedValue(mockCategory);

    const req = { params: { slug: 'tech' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // ACT
    await singleCategoryController(req, res);

    // ASSERT
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'tech' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Get SIngle Category SUccessfully',
      category: mockCategory,
    });
  });
});
