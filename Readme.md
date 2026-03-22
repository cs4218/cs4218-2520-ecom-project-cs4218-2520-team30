# CS4218 Project - Virtual Vault

## Team Contributions

| Features | Team Member | Client Related Files (`client/src/`) | Server Related Files (`./`) |
|----------|-------------|--------------------------------------|------------------------------|
| **Protected Routes** | Tay Kai Jun | - `context/auth.js` | - `helpers/authHelper.js`<br>- `middlewares/authMiddleware.js` |
| **Registration** | Tay Kai Jun | - `pages/Auth/Register.js` | - `controllers/authController.js`<br>  1. registerController |
| **Login** | Tay Kai Jun | - `pages/Auth/Login.js` | - `controllers/authController.js`<br>  1. loginController<br>  2. testController |
| **Forgot Password** | Tay Kai Jun | - `pages/Auth/ForgotPassword.js` | - `controllers/authController.js`<br>  1. forgotPasswordController |
| **Search** | Tay Kai Jun | - `components/Form/SearchInput.js`<br>- `context/search.js`<br>- `pages/Search.js` | | **Admin Dashboard** | Alek Kwek | - `components/AdminMenu.js`<br>- `pages/admin/AdminDashboard.js` | |
| **Admin Actions** | Alek Kwek |- `components/Form/CategoryForm.js`<br>- `pages/admin/CreateCategory.js`<br>- `pages/admin/CreateProduct.js`<br>- `pages/admin/UpdateProduct.js` | - `controllers/categoryController.js`<br>  1. createCategoryController<br>  2. updateCategoryController<br>  3. deleteCategoryController |
| **Admin View Orders** | Alek Kwek | - `pages/admin/AdminOrders.js` | |
| **Admin View Products** | Alek Kwek | - `pages/admin/Products.js` | - `controllers/productController.js`<br>  1. createProductController<br>  2. deleteProductController<br>  3. updateProductController |
| **General** | Leong Soon Mun Stephane | - `components/Routes/Private.js`<br>- `components/UserMenu.js`<br>- `pages/user/Dashboard.js` | - `models/userModel.js` |
| **Order** | Leong Soon Mun Stephane | - `pages/user/Orders.js` | - `controllers/authController.js`<br>  1. updateProfileController<br>  2. getOrdersController<br>  3. getAllOrdersController<br>  4. orderStatusController<br>- `models/orderModel.js` |
| **Profile** | Leong Soon Mun Stephane | - `pages/user/Profile.js` | |
| **Admin View Users** | Leong Soon Mun Stephane | - `pages/admin/Users.js` | - `controllers/authController.js`<br>  1. getAllUsersController |
| **Product** | Basil Boh | - `pages/ProductDetails.js`<br>- `pages/CategoryProduct.js` | - `controllers/productController.js`<br>  1. getProductController<br>  2. getSingleProductController<br>  3. productPhotoController<br>  4. productFiltersController<br>  5. productCountController<br>  6. productListController<br>  7. searchProductController<br>  8. realtedProductController<br>  9. productCategoryController<br>- `models/productModel.js` |
| **Contact** | Basil Boh | - `pages/Contact.js` | |
| **Policy** | Basil Boh | - `pages/Policy.js` | |
| **Cart** | Basil Boh | - `context/cart.js`<br>- `pages/CartPage.js` | |
| **General** | Johannsen Lum | - `components/Footer.js`<br>- `components/Header.js`<br>- `components/Layout.js`<br>- `components/Spinner.js`<br>- `pages/About.js`<br>- `pages/Pagenotfound.js` | - `config/db.js` |
| **Home** | Johannsen Lum | - `pages/Homepage.js` | |
| **Category** | Johannsen Lum | - `hooks/useCategory.js`<br>- `pages/Categories.js` | - `controllers/categoryController.js`<br>  1. categoryController<br>  2. singleCategoryController<br>- `models/categoryModel.js` |
| **Payment** | Johannsen Lum | | - `controllers/productController.js`<br>  1. braintreeTokenController<br>  2. brainTreePaymentController |

### MS2 Integration Testing Contributions

#### Alek Kwek (A0273471A)

Integration Testing

- Admin Category Actions
- `controllers/categoryController.integration.test.js`
- `client/src/pages/admin/CreateCategory.integration.test.js`

UI Testing

- To be updated

Bug Fixes / Notes

- `client/src/pages/admin/CreateCategory.js`
- Added missing React `key` for category table rows


### UI Tests (Playwright)


| Feature | Team Member | Test File | Files Tested | Test Flow |
|---------|-------------|-----------|--------------|-----------|
| **Registration** | Tay Kai Jun | `tests/ui/auth.spec.ts` | `pages/Auth/Register.js` | Form display → Field validation (password length, phone format) → Successful registration → Duplicate email handling |
| **Login** | Tay Kai Jun | `tests/ui/auth.spec.ts` | `pages/Auth/Login.js` | Admin login → User login → Wrong password → Logout flow → Full user journey (register → login → cart) |
| **Search** | Tay Kai Jun | `tests/ui/search.spec.ts` | `pages/Search.js`, `pages/ProductDetails.js`, `pages/CartPage.js` | Search products → View details → Add to cart → Cart persistence → Guest checkout |
| **Home Page Filtering** | Lum Yi Ren Johannsen | `tests/ui/HomePageFiltering.spec.ts` | `pages/HomePage.js`, `components/Prices.js` | Navigate to Home → Category filter → Price filter → Verify product grid updates → Reset filters → Restore default listing |
| **General Navigation & Error** | Lum Yi Ren Johannsen | `tests/ui/GeneralNavigation.spec.ts` | `components/Header.js`, `components/Footer.js`, `pages/Pagenotfound.js` | Check Home → Header Cart link → Footer About link → Invalid URL (404) → “Go back” / recovery routing |
| **Mobile Responsiveness** | Lum Yi Ren Johannsen | `tests/ui/ResponsiveMobile.spec.ts` | `pages/HomePage.js`, `components/Header.js` | Mobile viewport (375×812) → Open hamburger menu → Assert Home / Categories / Cart → Navigate to Cart → URL and cart page |

### Integration Tests (Jest)

*Includes backend Jest integration tests and frontend integration-style tests; entries marked with unmerged work follow the same note as UI tests.*

| Feature | Team Member | Test File | Components Tested | Test Flow |
|---------|-------------|-----------|-------------------|-----------|
| **Register Controller** | Tay Kai Jun | `tests/integration/auth/register.integration.test.js` | `authController.registerController` ↔ `userModel` ↔ `authHelper` | Model validation → Password hashing → Database persistence → Duplicate email handling → Response formatting |
| **Login Controller** | Tay Kai Jun | `tests/integration/auth/login.integration.test.js` | `authController.loginController` ↔ `userModel` ↔ `authHelper` | User lookup (MongoDB) → Password comparison (bcrypt) → JWT token generation → Role-based response |
| **Forgot Password** | Tay Kai Jun | `tests/integration/auth/forgotPassword.integration.test.js` | `authController.forgotPasswordController` ↔ `userModel` ↔ `authHelper` | Email+answer validation → Password hashing → Database update → Multi-user isolation |
| **Category Backend** | Lum Yi Ren Johannsen | `tests/integration/category/categoryIntegration.test.js` | `categoryController` ↔ `categoryModel` ↔ `mongodb-memory-server` | Validate input (BVA / EP) → Controller → Persist to in-memory MongoDB → Close connection to exercise error / 500 paths |
| **Home Page Frontend** | Lum Yi Ren Johannsen | `client/src/pages/HomePageIntegration.test.js` | `HomePage.js` ↔ `useCategory.js` ↔ `axios` (stubbed) | Stub HTTP by URL → Render page → Hook loads mock data → Assert UI for valid vs empty / error states |
| **Payment Backend** | Lum Yi Ren Johannsen | `tests/integration/payment/paymentIntegration.test.js` | `brainTreePaymentController` ↔ `orderModel` ↔ `mongodb-memory-server` | Nonce + cart → Stub `gateway.transaction.sale` → Poll DB for persisted order → Gateway failure → HTTP 500, no order |


## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:

   - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.

2. **Verify Installation**:
   - Open your terminal and check the installed versions of Node.js and npm:
     ```bash
     node -v
     npm -v
     ```

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:

   - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.

2. **Create a New Cluster**:

   - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
   - After logging in, create a project and within that project deploy a free cluster.

3. **Configure Database Access**:

   - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
   - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.

4. **Whitelist IP Address**:

   - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
   - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.

5. **Connect to the Database**:

   - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
   - Copy the connection string.

6. **Establish Connection with MongoDB Compass**:
   - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**

   - Go to the GitHub repository of the MERN app.
   - Click on the "Code" button and copy the URL of the repository.
   - Open your terminal or command prompt.
   - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:
     ```bash
     git clone <repository_url>
     ```
   - Navigate into the cloned directory.

2. **Install Frontend and Backend Dependencies**

   - Run the following command in your project's root directory:

     ```
     npm install && cd client && npm install && cd ..
     ```

3. **Add database connection string to `.env`**

   - Add the connection string copied from MongoDB Atlas to the `.env` file inside the project directory (replace the necessary placeholders):
     ```env
     MONGO_URL = <connection string>
     ```

4. **Adding sample data to database**

   - Download “Sample DB Schema” from Canvas and extract it.
   - In MongoDB Compass, create a database named `test` under your cluster.
   - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
   - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".

5. **Running the Application**
   - Open your web browser.
   - Use `npm run dev` to run the app from root directory, which starts the development server.
   - Navigate to `http://localhost:3000` to access the application.

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.  
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Alek Kwek, A0273471A

Integration Testing
Existing Jest-based integration coverage for Admin Orders was left separate and unchanged.

UI Testing
Added Playwright black-box admin order flows that log in through the UI, navigate from the admin dashboard to the orders page, view real order data, update a real order status, and verify the persisted result after returning to the orders page.

Bug Fixes / Notes
UI tests now run the real backend and frontend against a dedicated `playwright_ms2_ui` database, and Playwright cleanup only deletes exact Playwright-owned records identified by fixed `_id` values. The Playwright backend startup also supplies fallback JWT and Braintree environment values when those secrets are absent so the admin-orders UI flow can run in CI without touching unrelated auth secret management or payment features.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:  
   Use your preferred package manager to install Jest. For instance, with npm:

   ```bash
   npm install --save-dev jest

   ```

2. **Write Tests**  
   Create test files for your components or units where you define test cases to evaluate their behaviour.

3. **Run Tests**  
   Execute your tests using Jest to ensure that your components meet the expected behaviour.  
   You can run the tests by using the following command in the root of the directory:

   - **Frontend tests**

     ```bash
     npm run test:frontend
     ```

   - **Backend tests**

     ```bash
     npm run test:backend
     ```

   - **All the tests**
     ```bash
     npm run test
     ```

## MS2 Contributions

### Alek Kwek, A0273471A

Integration Testing
- Added top-down Admin Product Management integration tests for `client/src/pages/admin/CreateProduct.js` and `client/src/pages/admin/UpdateProduct.js` in separate `.integration.test.js` files.
- Verified backend route integration for admin product create, update, and delete flows in `controllers/productController.integration.test.js`, including authentication and admin-authorization checks on delete.

UI Testing
- Admin Product Management UI testing remains in the existing Playwright/UI work for this scope.

Bug Fixes / Notes
- Secured `DELETE /api/v1/product/delete-product/:pid` with `requireSignIn` and `isAdmin` so delete matches the protected admin-only behavior of create and update.
- Fixed the Update Product page title to `Dashboard - Update Product` and corrected the shipping select binding so the loaded product state maps cleanly into the form.
