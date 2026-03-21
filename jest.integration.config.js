export default {
  displayName: "integration",
  testEnvironment: "node",
  testMatch: [
    "**/tests/integration/**/*.integration.test.js",
  ],
  collectCoverage: false,
  setupFiles: ["<rootDir>/tests/integration/setup-braintree-mock.cjs"],
};
