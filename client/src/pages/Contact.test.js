import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Contact from "./Contact";

// Replace the real Layout (Header, Footer, Helmet) with a minimal wrapper to test
// only Contact's behaviour. MockLayout receives the same props (children, title) and
// renders them with data-testid attributes so tests can query the layout and title
// without depending on Layout's internals.
jest.mock("../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout">
    <span data-testid="layout-title">{title}</span>
    {children}
  </div>
));

jest.mock("react-icons/bi", () => ({
  BiMailSend: () => <span data-testid="icon-mail" />,
  BiPhoneCall: () => <span data-testid="icon-phone" />,
  BiSupport: () => <span data-testid="icon-support" />,
}));

describe("Contact Page", () => {
  it("renders the contact page", () => {
    // Arrange & Act
    render(<Contact />);
    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it("passes the correct title to Layout", () => {
    // Arrange & Act
    render(<Contact />);
    // Assert
    expect(screen.getByTestId("layout-title")).toHaveTextContent("Contact us");
  });

  it("renders the CONTACT US heading", () => {
    // Arrange & Act
    render(<Contact />);
    // Assert
    expect(screen.getByRole("heading", { name: /contact us/i })).toBeInTheDocument();
  });

  it("renders contact info text", () => {
    // Arrange & Act
    render(<Contact />);
    // Assert
    expect(screen.getByText(/For any query or info about product/)).toBeInTheDocument();
    expect(screen.getByText(/012-3456789/)).toBeInTheDocument();
    expect(screen.getByText(/1800-0000-0000/)).toBeInTheDocument();
  });

  it("renders the contact image", () => {
    // Arrange & Act
    render(<Contact />);
    // Assert
    const img = screen.getByAltText("contactus");
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });
});