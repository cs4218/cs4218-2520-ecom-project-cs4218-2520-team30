export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: ["**/controllers/*.test.js", "**/config/*.test.js"],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: ["config/**"],
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
    },
  },
};
