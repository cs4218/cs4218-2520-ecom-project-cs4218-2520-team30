export default {
  displayName: "backend",
  testEnvironment: "node",
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  testMatch: [
    "**/controllers/*.test.js",
    "**/config/*.test.js",
    "**/middlewares/*.test.js",
    "**/helpers/*.test.js",
    "**/models/*.test.js",
  ],
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
