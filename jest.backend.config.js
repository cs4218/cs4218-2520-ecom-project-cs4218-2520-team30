export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: ["**/controllers/*.test.js", "**/config/*.test.js"],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "config/**",
    "controllers/categoryController.js",
    "controllers/productController.js",
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
};
