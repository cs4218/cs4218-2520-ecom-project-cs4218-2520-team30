import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Register from './Register';

/**
 * ============================================
 * TESTING APPROACH: SANDWICH (HYBRID) TESTING
 * ============================================
 * 
 * This file tests the TOP LAYER (UI Component) of the registration feature.
 * 
 * JUSTIFICATION FOR SANDWICH TESTING:
 * 
 * 1. Architecture Overview:
 *    - TOP: Register.js (UI Component) <- THIS FILE
 *    - MIDDLE: API Routes
 *    - BOTTOM: authController.js (Business Logic)
 * 
 * 2. Why Sandwich over alternatives:
 *    - Top-Down: Would need stubs for everything below, delaying real testing
 *    - Bottom-Up: Would delay UI testing until backend complete
 *    - Sandwich: Tests both ends simultaneously, catches integration issues early
 * 
 * 3. Test Doubles Used (from testDoubles folder):
 *    - MOCKS: axios.post, toast - verify API calls and notifications
 *    - STUBS: useAuth, useCart, useSearch - return predetermined context values
 *    - FAKES: localStorage, matchMedia - simplified browser implementations
 * 
 * ============================================
 */

// ============================================
// MOCKS - Verify interactions with external services
// ============================================
jest.mock('axios');
jest.mock('react-hot-toast');

// ============================================
// STUBS - Provide predetermined context values
// (In production, these would be imported from testDoubles/stubs/contextStubs.js
//  but Jest requires inline mocks for module mocking)
// ============================================
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

// ============================================
// FAKES - Simplified working implementations
// ============================================

// Fake localStorage - in-memory storage implementation
const fakeLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: fakeLocalStorage,
  writable: true,
});

// Fake matchMedia - simplified media query implementation
window.matchMedia = window.matchMedia || function(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: function() {},
    removeListener: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() { return false; },
  };
};

// ============================================
// TEST HELPERS
// ============================================

/**
 * Render Register component with router context
 */
const renderRegister = () => {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

/**
 * Fill all form fields with test data
 */
const fillRegistrationForm = (getByPlaceholderText, data = {}) => {
  const defaultData = {
    name: 'John Doe',
    email: 'test@example.com',
    password: 'password123',
    phone: '1234567890',
    address: '123 Street',
    dob: '2000-01-01',
    answer: 'Football',
    ...data,
  };

  fireEvent.change(getByPlaceholderText('Enter Your Name'), { target: { value: defaultData.name } });
  fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: defaultData.email } });
  fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: defaultData.password } });
  fireEvent.change(getByPlaceholderText('Enter Your Phone'), { target: { value: defaultData.phone } });
  fireEvent.change(getByPlaceholderText('Enter Your Address'), { target: { value: defaultData.address } });
  fireEvent.change(getByPlaceholderText('Enter Your DOB'), { target: { value: defaultData.dob } });
  fireEvent.change(getByPlaceholderText('What is Your Favorite sports'), { target: { value: defaultData.answer } });

  return defaultData;
};

// ============================================
// TEST SUITES
// ============================================

describe('Register Component (TOP LAYER - UI Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fakeLocalStorage.clear();
  });

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('Rendering', () => {
    it('should render registration form with all fields', () => {
      const { getByText, getByPlaceholderText } = renderRegister();

      expect(getByText('REGISTER FORM')).toBeInTheDocument();
      expect(getByPlaceholderText('Enter Your Name')).toBeInTheDocument();
      expect(getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
      expect(getByPlaceholderText('Enter Your Password')).toBeInTheDocument();
      expect(getByPlaceholderText('Enter Your Phone')).toBeInTheDocument();
      expect(getByPlaceholderText('Enter Your Address')).toBeInTheDocument();
      expect(getByPlaceholderText('Enter Your DOB')).toBeInTheDocument();
      expect(getByPlaceholderText('What is Your Favorite sports')).toBeInTheDocument();
      expect(getByText('REGISTER')).toBeInTheDocument();
    });

    it('should have empty input fields initially', () => {
      const { getByPlaceholderText } = renderRegister();

      expect(getByPlaceholderText('Enter Your Name').value).toBe('');
      expect(getByPlaceholderText('Enter Your Email').value).toBe('');
      expect(getByPlaceholderText('Enter Your Password').value).toBe('');
    });

    it('should have required attributes on all fields', () => {
      const { getByPlaceholderText } = renderRegister();

      expect(getByPlaceholderText('Enter Your Name')).toBeRequired();
      expect(getByPlaceholderText('Enter Your Email')).toBeRequired();
      expect(getByPlaceholderText('Enter Your Password')).toBeRequired();
      expect(getByPlaceholderText('Enter Your Phone')).toBeRequired();
      expect(getByPlaceholderText('Enter Your Address')).toBeRequired();
    });
  });

  // ============================================
  // INPUT HANDLING TESTS
  // ============================================
  describe('Input Handling', () => {
    it('should update name field on change', () => {
      const { getByPlaceholderText } = renderRegister();
      const nameInput = getByPlaceholderText('Enter Your Name');

      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

      expect(nameInput.value).toBe('Jane Doe');
    });

    it('should update email field on change', () => {
      const { getByPlaceholderText } = renderRegister();
      const emailInput = getByPlaceholderText('Enter Your Email');

      fireEvent.change(emailInput, { target: { value: 'jane@test.com' } });

      expect(emailInput.value).toBe('jane@test.com');
    });

    it('should update all fields correctly', () => {
      const { getByPlaceholderText } = renderRegister();
      
      const formData = fillRegistrationForm(getByPlaceholderText, {
        name: 'Test User',
        email: 'testuser@example.com',
      });

      expect(getByPlaceholderText('Enter Your Name').value).toBe(formData.name);
      expect(getByPlaceholderText('Enter Your Email').value).toBe(formData.email);
    });
  });

  // ============================================
  // SUCCESSFUL REGISTRATION TESTS
  // ============================================
  describe('Successful Registration', () => {
    it('should register the user successfully', async () => {
      // ARRANGE - Configure MOCK to return success
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      const { getByText, getByPlaceholderText } = renderRegister();
      fillRegistrationForm(getByPlaceholderText);

      // ACT
      fireEvent.click(getByText('REGISTER'));

      // ASSERT - Verify MOCK was called correctly
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/register', {
        name: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
        phone: '1234567890',
        address: '123 Street',
        DOB: '2000-01-01',
        answer: 'Football',
      });
      expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
    });

    it('should call API with correct payload for different user data', async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      const { getByText, getByPlaceholderText } = renderRegister();
      fillRegistrationForm(getByPlaceholderText, {
        name: 'Alice Smith',
        email: 'alice@test.com',
        password: 'alicePass789',
        phone: '5551234567',
        address: '789 Boulevard',
        dob: '1998-03-20',
        answer: 'Tennis',
      });

      fireEvent.click(getByText('REGISTER'));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/register', 
        expect.objectContaining({
          name: 'Alice Smith',
          email: 'alice@test.com',
        })
      );
    });
  });

  // ============================================
  // FAILED REGISTRATION TESTS
  // ============================================
  describe('Failed Registration', () => {
    it('should display error message on failed registration', async () => {
      // ARRANGE - Configure MOCK to reject
      axios.post.mockRejectedValueOnce({ message: 'User already exists' });

      const { getByText, getByPlaceholderText } = renderRegister();
      fillRegistrationForm(getByPlaceholderText);

      // ACT
      fireEvent.click(getByText('REGISTER'));

      // ASSERT
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });

    it('should display server error message when registration fails', async () => {
      // ARRANGE - Server returns success: false with message
      axios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Already Register please login',
        },
      });

      const { getByText, getByPlaceholderText } = renderRegister();
      fillRegistrationForm(getByPlaceholderText);

      // ACT
      fireEvent.click(getByText('REGISTER'));

      // ASSERT
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith('Already Register please login');
    });

    it('should handle network errors gracefully', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network Error'));

      const { getByText, getByPlaceholderText } = renderRegister();
      fillRegistrationForm(getByPlaceholderText);

      fireEvent.click(getByText('REGISTER'));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Edge Cases', () => {
    it('should handle special characters in name', async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      const { getByText, getByPlaceholderText } = renderRegister();
      fillRegistrationForm(getByPlaceholderText, { name: "John O'Brien-Smith" });

      fireEvent.click(getByText('REGISTER'));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/register',
        expect.objectContaining({ name: "John O'Brien-Smith" })
      );
    });

    it('should handle international phone numbers', async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      const { getByText, getByPlaceholderText } = renderRegister();
      fillRegistrationForm(getByPlaceholderText, { phone: '+1-555-123-4567' });

      fireEvent.click(getByText('REGISTER'));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/register',
        expect.objectContaining({ phone: '+1-555-123-4567' })
      );
    });
  });
});
