export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // Transpile backend ESM so Jest can execute it consistently on Node 24.
  transform: {
    "^.+\\.js$": "babel-jest",
  },

  // which test to run
  testMatch: [
    "**/controllers/*.test.js",
    "**/controllers/*.integration.test.js",
    "**/config/*.test.js",
    "**/middlewares/*.test.js",
    "**/helpers/*.test.js",
    "**/models/*.test.js",
    "**/routes/*.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "models/orderModel.js",
    "config/**",
    "controllers/categoryController.js",
    "controllers/authController.js",
    "controllers/productController.js",
    "middlewares/authMiddleware.js",
    "helpers/authHelper.js",
    "models/categoryModel.js",
    "models/productModel.js",
    "models/userModel.js",
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
};
