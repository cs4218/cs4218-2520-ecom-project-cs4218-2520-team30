import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";

jest.mock("./Header", () => () => <div data-testid="mock-header">Header</div>);
jest.mock("./Footer", () => () => <div data-testid="mock-footer">Footer</div>);
jest.mock("react-helmet", () => ({
  Helmet: ({ children }) => <div data-testid="mock-helmet">{children}</div>,
}));
jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="mock-toaster" />,
}));

import Layout from "./Layout";

describe("Layout Component", () => {
  it("renders Header, Footer, and children props", () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    // Define child content to verify it is rendered
    const testMessage = "Test Child Content";

    // ACT
    render(
      <MemoryRouter>
        <Layout title="Test Title">
          <main>{testMessage}</main>
        </Layout>
      </MemoryRouter>
    );

    // ASSERT
    // Assert mock Header, mock Footer, and child text are in the document
    expect(screen.getByTestId("mock-header")).toBeInTheDocument();
    expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
    expect(screen.getByText(testMessage)).toBeInTheDocument();
  });
});
