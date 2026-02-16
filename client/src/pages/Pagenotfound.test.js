import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import Pagenotfound from "./Pagenotfound";

jest.mock("../components/Layout", () => ({ children }) => <div>{children}</div>);

describe("Pagenotfound Page", () => {
  it("renders the 404 error message", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE & ACT
    render(
      <MemoryRouter>
        <Pagenotfound />
      </MemoryRouter>
    );

    // ASSERT
    expect(screen.getByText(/404/i)).toBeInTheDocument();
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
  });

  it("renders a Go Back link", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE & ACT
    render(
      <MemoryRouter>
        <Pagenotfound />
      </MemoryRouter>
    );

    // ASSERT
    expect(screen.getByRole("link", { name: /Go Back/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go Back/i })).toHaveAttribute("href", "/");
  });
});
