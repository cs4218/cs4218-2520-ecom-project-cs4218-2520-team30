/**
 * Hoisted Braintree mock for integration tests (CommonJS so jest.mock runs before ESM specs).
 * Use global `jest` — setupFiles inject it; requiring @jest/globals can redeclare `jest`.
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
