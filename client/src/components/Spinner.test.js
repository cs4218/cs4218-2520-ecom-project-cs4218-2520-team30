import React from "react";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";

const mockedNavigate = jest.fn();
const mockedLocation = { pathname: "/" };

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
  useLocation: () => mockedLocation,
}));

import Spinner from "./Spinner";

describe("Spinner Component", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the spinner element correctly", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    // Mocks are at module level; MemoryRouter wraps the component
    // ACT
    render(
      <MemoryRouter>
        <Spinner />
      </MemoryRouter>
    );

    // ASSERT
    // Assert redirect message and spinner (role status) are present
    expect(screen.getByText(/redirecting/i)).toBeInTheDocument();
    expect(screen.getByText(/redirecting to you in 3 second/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("countdown reaches zero and navigates to path with state", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    jest.useFakeTimers();

    // ACT
    render(
      <MemoryRouter>
        <Spinner path="login" />
      </MemoryRouter>
    );
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // ASSERT
    expect(mockedNavigate).toHaveBeenCalledWith(
      "/login",
      expect.objectContaining({ state: "/" })
    );
  });
});
