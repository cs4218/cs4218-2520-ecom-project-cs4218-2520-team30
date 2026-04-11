// Lum Yi Ren Johannsen, A0273503L
// ms3
export default {
  displayName: "nft-recovery",
  testEnvironment: "node",
  testMatch: ["**/tests/nft/recovery/**/*.test.js"],
  testTimeout: 30000,
  collectCoverage: false,
  setupFiles: ["<rootDir>/tests/integration/setup-braintree-mock.cjs"],
};
