/**
 * Hoisted Braintree mock for integration tests that mount productRoutes (productController loads gateway at import).
 * Use global `jest` from setupFiles — not @jest/globals (redeclares `jest`).
 *
 * Basil Boh, A0273232M
 */

jest.mock("braintree", () => {
  const mockSale = jest.fn();
  const mockGenerate = jest.fn();
  const Gateway = jest.fn().mockImplementation(() => ({
    clientToken: { generate: mockGenerate },
    transaction: { sale: mockSale },
  }));
  Gateway._mockGenerate = mockGenerate;
  Gateway._mockSale = mockSale;
  return {
    BraintreeGateway: Gateway,
    Environment: { Sandbox: "Sandbox" },
  };
});
