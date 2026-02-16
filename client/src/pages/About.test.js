import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import About from "./About";

jest.mock("../components/Layout", () => ({ children }) => <div>{children}</div>);

describe("About Page", () => {
  it("renders the About Us content correctly", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE & ACT
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    // ASSERT
    expect(screen.getByText(/Add text/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /contactus/i })).toBeInTheDocument();
  });
});
