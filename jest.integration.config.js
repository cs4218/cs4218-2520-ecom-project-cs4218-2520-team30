/**
 * Jest config for Node integration tests.
 * setupFiles loads hoisted Braintree mock (see tests/integration/setup-braintree-mock.cjs).
 *
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
