export default {
  displayName: "search-tests",
  testEnvironment: "jest-environment-jsdom",
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],
  testMatch: [
    "<rootDir>/client/src/components/Form/SearchInput.test.js",
    "<rootDir>/client/src/pages/Search.test.js",
    "<rootDir>/client/src/context/search.test.js",
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/components/Form/SearchInput.js",
    "client/src/pages/Search.js",
    "client/src/context/search.js",
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
