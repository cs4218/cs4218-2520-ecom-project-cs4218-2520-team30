export default {
  // name displayed during tests
  displayName: "frontend",

  // simulates browser environment in jest
  // e.g., using document.querySelector in your tests
  testEnvironment: "jest-environment-jsdom",

  // jest does not recognise jsx files by default, so we use babel to transform any jsx files
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  // tells jest how to handle css/scss imports in your tests
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  // ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // only run these tests
  testMatch: [
    "<rootDir>/client/src/pages/Auth/*.test.js",
    "<rootDir>/client/src/pages/Search.test.js",
    "<rootDir>/client/src/pages/HomePage.test.js",
    "<rootDir>/client/src/pages/Categories.test.js",
    "<rootDir>/client/src/hooks/useCategory.test.js",
    "<rootDir>/client/src/pages/admin/Products.test.js",
    "<rootDir>/client/src/pages/admin/AdminOrders.test.js",
    "<rootDir>/client/src/pages/About.test.js",
    "<rootDir>/client/src/pages/Pagenotfound.test.js",
    "<rootDir>/client/src/components/Form/SearchInput.test.js",
    "<rootDir>/client/src/context/search.test.js",
    "<rootDir>/client/src/pages/admin/*.test.js",
    "<rootDir>/client/src/components/*.test.js",
    "<rootDir>/client/src/components/*.test.js",
    "<rootDir>/client/src/context/search.test.js",
    "<rootDir>/client/src/pages/Policy.test.js",
    "<rootDir>/client/src/pages/About.test.js",
    "<rootDir>/client/src/pages/Pagenotfound.test.js",
    "<rootDir>/client/src/components/Form/SearchInput.test.js",
    "<rootDir>/client/src/components/*.test.js",
    "<rootDir>/client/src/context/search.test.js",
    "<rootDir>/client/src/components/AdminMenu.test.js",
    "<rootDir>/client/src/pages/admin/Users.test.js",
    "<rootDir>/client/src/context/cart.test.js",
    "<rootDir>/client/src/pages/CartPage.test.js",
    "<rootDir>/client/src/pages/Contact.test.js",
    "<rootDir>/client/src/context/auth.test.js",
    "<rootDir>/client/src/pages/user/Profile.test.js",
    "<rootDir>/client/src/pages/user/Orders.test.js",
  ],

  // jest code coverage
  // Alek Kwek, A0273471A

  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/pages/Auth/**",
    "client/src/pages/Policy.js",
    "client/src/pages/CartPage.js",
    "client/src/pages/Contact.js",
    "client/src/pages/Search.js",
    "client/src/pages/Categories.js",
    "client/src/components/Form/SearchInput.js",
    "client/src/context/search.js",
    "client/src/pages/admin/**",
    "client/src/pages/admin/Products.js",
    "client/src/pages/admin/AdminOrders.js",
    "client/src/components/**",
    "client/src/context/cart.js",
    "client/src/context/auth.js",
    "client/src/hooks/useCategory.js",
    "client/src/pages/HomePage.js",
    "client/src/pages/About.js",
    "client/src/pages/Pagenotfound.js",
    "client/src/components/Header.js",
    "client/src/components/Footer.js",
    "client/src/components/Layout.js",
    "client/src/components/Spinner.js",
    "client/src/components/AdminMenu.js",
    "client/src/pages/Auth/ForgotPassword.js",
    "client/src/pages/user/Profile.js",
    "client/src/pages/user/Orders.js",
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
      branches: 100,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
