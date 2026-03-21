/**
 * Hoisted Braintree mock for integration tests (CommonJS so jest.mock runs before ESM specs).
 * Basil Boh A0273232M
 * (Use global `jest` — setupFiles already inject it; @jest/globals would redeclare `jest`.)
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
