import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";
import "@testing-library/jest-dom";

describe("Footer Component", () => {
  it("renders the copyright text correctly", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    // No complex setup needed; MemoryRouter is required for Link components
    // ACT
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    // ASSERT
    // Assert copyright and brand text are present
    expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();
    expect(screen.getByText(/TestingComp/i)).toBeInTheDocument();
  });

  it("renders the About, Contact, and Privacy Policy links", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    // No extra setup; render with MemoryRouter for Link support
    // ACT
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    // ASSERT
    // Assert the three navigation link labels are in the document
    expect(screen.getByText(/About/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
  });
});
