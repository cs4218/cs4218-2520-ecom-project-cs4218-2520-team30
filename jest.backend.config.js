export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: ["**/controllers/*.test.js", "**/config/*.test.js", "**/models/*.test.js"],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: ["config/**", "controllers/categoryController.js", "models/categoryModel.js"],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
};
