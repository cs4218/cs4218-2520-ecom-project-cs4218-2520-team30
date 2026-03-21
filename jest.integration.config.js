/**
 * setupFiles: Braintree mock when specs mount productRoutes (productController).
 * Basil Boh, A0273232M
 */
export default {
  displayName: "integration",
  testEnvironment: "node",
  testMatch: [
    "**/tests/integration/**/*.integration.test.js",
  ],
  collectCoverage: false,
  setupFiles: ["<rootDir>/tests/integration/setup-braintree-mock.cjs"],
};
