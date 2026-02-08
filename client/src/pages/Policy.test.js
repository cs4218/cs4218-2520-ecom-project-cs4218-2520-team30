import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Policy from "./Policy";

// Replace the real Layout (Header, Footer, Helmet) with a minimal wrapper to test
// only Policy's behaviour. MockLayout receives the same props (children, title) and
// renders them with data-testid attributes so tests can query the layout and title
// without depending on Layout's internals.
jest.mock("../components/Layout", () => {
  return function MockLayout({ children, title }) {
    return (
      <div data-testid="layout">
        <span data-testid="layout-title">{title}</span>
        {children}
      </div>
    );
  };
});

describe("Policy Page", () => {
  it("renders the policy page", () => {
    // Arrange: Policy component with no props
    // Act: render the Policy component
    render(<Policy />);
    // Assert: layout wrapper is present in the document
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it("passes the correct title to Layout", () => {
    // Arrange: Policy component with no props
    // Act: render the Policy component
    render(<Policy />);
    // Assert: the title passed to Layout is "Privacy Policy"
    expect(screen.getByTestId("layout-title")).toHaveTextContent("Privacy Policy");
  });

  it("renders the policy content paragraphs", () => {
    // Arrange: Policy component with no props
    // Act: render the Policy component
    render(<Policy />);
    // Assert: exactly 7 "add privacy policy" paragraphs are rendered
    const paragraphs = screen.getAllByText("add privacy policy");
    expect(paragraphs.length).toBe(7);
  });
});