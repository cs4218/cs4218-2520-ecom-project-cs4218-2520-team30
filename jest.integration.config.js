export default {
  displayName: "integration",
  testEnvironment: "node",
  testMatch: [
    "**/tests/integration/**/*.integration.test.js",
    "**/tests/integration/payment/paymentIntegration.test.js",
  ],
  collectCoverage: false,
};
