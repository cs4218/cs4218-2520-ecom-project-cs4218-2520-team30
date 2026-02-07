import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Spinner from './Spinner';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/current' }),
  };
});

describe('Spinner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders countdown text and spinner', () => {
    render(<Spinner />);
    expect(screen.getByText(/redirecting to you in 3 second/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('navigates to default path login after countdown', () => {
    render(<Spinner />);
    expect(mockNavigate).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      state: '/current',
    });
  });

  it('navigates to custom path when path prop is provided', () => {
    render(<Spinner path="dashboard" />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
      state: '/current',
    });
  });
});
