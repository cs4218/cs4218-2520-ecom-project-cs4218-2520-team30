# CS4218 Project - Virtual Vault

## Team Contributions

| Features | Team Member | Client Related Files (`client/src/`) | Server Related Files (`./`) |
|----------|-------------|--------------------------------------|------------------------------|
| **Protected Routes** | Tay Kai Jun | - `context/auth.js` | - `helpers/authHelper.js`<br>- `middlewares/authMiddleware.js` |
| **Registration** | Tay Kai Jun | - `pages/Auth/Register.js` | - `controllers/authController.js`<br>  1. registerController |
| **Login** | Tay Kai Jun | - `pages/Auth/Login.js` | - `controllers/authController.js`<br>  1. loginController<br>  2. testController |
| **Forgot Password** | Tay Kai Jun | - `pages/Auth/ForgotPassword.js` | - `controllers/authController.js`<br>  1. forgotPasswordController |
| **Search** | Tay Kai Jun | - `components/Form/SearchInput.js`<br>- `context/search.js`<br>- `pages/Search.js` | | **Admin Dashboard** | Alek Kwek | - `components/AdminMenu.js`<br>- `pages/admin/AdminDashboard.js` | |
| **Admin Actions** | Alek Kwek | - `components/Form/CategoryForm.js`<br>- `pages/admin/CreateCategory.js`<br>- `pages/admin/CreateProduct.js`<br>- `pages/admin/UpdateProduct.js` | - `controllers/categoryController.js`<br>  1. createCategoryController<br>  2. updateCategoryController<br>  3. deleteCategoryController |
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

## MS2 Contributions

### Alek Kwek (A0273471A)

**Integration Testing**

- Admin Category Actions: `controllers/categoryController.integration.test.js` and `client/src/pages/admin/CreateCategory.integration.test.js`.
- Admin Product Management: Top-down integration tests for `client/src/pages/admin/CreateProduct.js` and `client/src/pages/admin/UpdateProduct.js`.
- Verified backend route integration for admin product create, update, and delete flows in `controllers/productController.integration.test.js`, including authentication and admin-authorization checks on delete.

**UI Testing**

- Developed and organized a comprehensive Playwright UI test suite, including `admin-management.ui.spec.js`, `adminFlow.ui.spec.js`, `create-category.ui.spec.js`, `create-product.ui.spec.js`, and `admin-orders.ui.spec.js`.
- Reorganized the test directory by moving all UI specification files to the `tests/ui/` folder and updating all internal paths, imports, and asset resolutions.
- Standardized UI-test setup to use isolated MongoDB instances and strict ownership markers for reliable data cleanup.

**Bug Fixes / Notes**

- Resolved a critical race condition in Admin Login UI tests by implementing an auto-admin policy in `authController.js` for `@admin.com` accounts.
- Fixed a module mismatch (ESM/CommonJS) in Playwright configuration that was preventing test execution.
- Fixed missing product catalog items ("NUS T-shirt") in `uiTestUtils.js` that was causing `orders.spec.ts` failures.
- Implemented serialized test execution (`workers: 1`) in `playwright.config.mjs` to eliminate database collisions in tests using shared accounts.
- Secured the product deletion API with proper authentication and admin middleware to match create/update permissions.
- Fixed UI bugs in `UpdateProduct.js` and `AdminOrders.js` including incorrect page titles, shipping selection bindings, and typo in order date field (`createdAt`).
- Switched the status Select in `AdminOrders.js` from `defaultValue` to `value` so the UI stays in sync after status updates.
- Resolved React rendering warnings by adding missing `key` props and updating Ant Design modal properties.

### Leong Soon Mun Stephane (A0273409B)

**Integration Testing**

- Profile Feature: `routes/authRoute.updateprofile.integration.test.js`, `controllers/authController.updateprofile.integration.test.js`, `client/src/pages/user/Profile.integration.test.js`.
- Order Feature: `routes/authRoute.getorders.integration.test.js`, `controllers/authController.getorders.integration.test.js`, `client/src/pages/user/Orders.integration.test.js`.
- Admin View Users Feature: `routes/authRoute.getallusers.integration.test.js`, `controllers/authController.getallusers.integration.test.js`, `client/src/pages/admin/Users.integration.test.js`.
- General Feature: `routes/authRoute.userauth.integration.test.js`, `client/src/pages/user/Dashboard.integration.test.js`.

**UI Testing**

- `tests/ui/general.spec.ts`
- `tests/ui/orders.spec.ts`
- `tests/ui/profile.spec.ts`
- `tests/ui/users.spec.ts`

### Basil Boh (A0273232M)

**Integration Testing (Jest)**

- **Payment (Braintree + orders)**: `tests/integration/product/payment.integration.test.js`. JWT/auth → cart POST to `/braintree/payment` → mocked Braintree gateway (`setup-braintree-mock.cjs`) → order persistence with `ObjectId` product refs → success vs 401 vs gateway failure partitions.
- **Cart–product flow**: `tests/integration/product/cart-product.integration.test.js`. Seed category/product in MongoMemoryServer → GET product for cart-shaped payload → authenticated payment → order references match catalog response.
- **Product details ↔ category**: `tests/integration/product/product-details-category.integration.test.js`. Category listing by slug → single product with category alignment → related products (same category, exclude current) → chained GET consistency.

**UI Testing (Playwright)**

- **Browsing & product details**: `tests/ui/browsing.spec.ts`. Homepage catalog → category/price filters → More Details → product page → similar products section (and navigation where applicable).
- **Cart & checkout**: `tests/ui/cart.spec.ts`. Empty cart → add/remove from homepage or details → guest vs logged-in checkout behaviour → cart badge → successful checkout → orders destination.
- **Contact**: `tests/ui/contact.spec.ts`. Contact page content (heading, details, hero) → footer **Contact** link from About.
- **Policy**: `tests/ui/policy.spec.ts`. Privacy policy page → footer **Privacy Policy** link from About.

### Tay Kai Jun (A0283343E)

**UI Testing (Playwright)**

- **Registration**: `tests/ui/auth.spec.ts`. Form display → Field validation → Successful registration → Duplicate email handling.
- **Login**: `tests/ui/auth.spec.ts`. Admin login → User login → Wrong password → Logout flow → Full user journey.
- **Search**: `tests/ui/search.spec.ts`. Search flow → Add to cart → View details → Empty search handling.

**Integration Testing (Jest)**

- **Register Controller**: `tests/integration/auth/register.integration.test.js`. Model validation → Password hashing → Database persistence → Duplicate email handling.
- **Login Controller**: `tests/integration/auth/login.integration.test.js`. User lookup → Password comparison → JWT token generation → Role-based response.
- **Forgot Password**: `tests/integration/auth/forgotPassword.integration.test.js`. Email+answer validation → Password hashing → Database update.

## MS3 Contributions
### Alek Kwek (A0273471A)

**AI-Driven Testing**

- Implemented the MS3 AI-driven testing pipeline under `ai-testing/`, including `analyse_results.py` for reading Jest and Playwright JSON outputs, `system_prompt.txt` for the agent instructions, `n8n-workflow.json` for the webhook-to-PR-comment automation flow, `sample-output.json`, and the accompanying `ai-testing/README.md`.
- Integrated CI support in `.github/workflows/main.yml` so backend, frontend, and integration Jest runs can emit JSON reports for the AI agent, and aligned Playwright output through `playwright.config.mjs` so `playwright-report/results.json` is generated for automated analysis.
- Added the PR-comment automation path for AI analysis, where CI results are sent to n8n, analysed by Claude, and summarised back onto the pull request with failure classification, brittle test detection, flaky test tracking, and prioritised fix suggestions.
- Documented the local developer workflow for generating test JSON artifacts and running `python ai-testing/analyse_results.py` for manual inspection outside CI.

**Load Testing (Grafana k6)**

- Added a k6 load testing suite targeting the Express backend at `http://localhost:6060` across major ecommerce flows.
- Implemented `k6/anonymous-browsing.js` for catalog, product detail, related products, photo, filters, and search flows, peaking at 100 VUs over about 5 minutes.
- Implemented `k6/auth-user-flows.js` for register, login, JWT user-auth checks, profile update, and orders flows, peaking at 30 VUs over about 5 minutes.
- Implemented `k6/admin-flows.js` for admin auth, all-orders retrieval, order-status updates, category CRUD, and product list flows, peaking at 10 VUs over about 5 minutes.
- Implemented `k6/mixed-flows.js` as the main MS3 scenario covering browse → login → checkout-init behaviour, peaking at 40 VUs over about 11 minutes.
- Implemented `k6/bottleneck-stress.js` to isolate five bottlenecks as named scenarios: product photo delivery, unindexed search, bcrypt-heavy registration, admin order retrieval, and profile updates.
- Added `k6/helpers.js` with shared utilities for auth, request headers, response checks, JSON parsing, and unique ID generation.

**Docker and Config Support**

- Added `Dockerfile.k6`, `docker-compose.k6.yml`, and `.env.docker.example` to run MongoDB, the app, seed-admin setup, and k6 together with health checks and resource limits.
- Added external config support for `mixed-flows.js`, including `k6/config.ecom-realistic.json` and `k6/config.ecom-very-high-load.json` for business-hours and peak-load profiles.
- Documented runtime overrides for `K6_BASE_URL`, `K6_MAX_DURATION_MS`, `K6_ADMIN_EMAIL`, and `K6_ADMIN_PASSWORD`.

**Performance Fixes Driven by Load Testing**

- Updated `getAllOrdersController` to support `page` and `limit` query parameters, reducing unbounded admin-order result sets and improving pass rate under concurrent load.
- Optimised `updateProfileController` by replacing a two-query update flow with a single `findByIdAndUpdate` plus sparse `$set` updates, reducing profile-update latency under stress.
- Added indexes in `productModel.js` for `slug`, `category`, `createdAt`, and text search on `name` plus `description` to improve product lookup, pagination, related products, and search behaviour under load.
  
### Tay Kai Jun (A0283343E)

**Non-Functional Testing: Spike Testing (Grafana k6)**

- **Search API Spike Test**: `tests/nft/spike/spike-search-k6.js`. Simulates sudden traffic spikes (2→100→2 VUs) to evaluate search API latency, throughput, and error behavior under peak load.
- **Login API Flash-Sale Spike Test**: `tests/nft/spike/spike-login-k6.js`. Simulates a flash-sale authentication surge (0→200→0 VUs) to assess login stability, token issuance rate, and recovery after extreme load.

**Non-Functional Testing: Frontend Spike Testing (Playwright)**

- **Search Rendering Spike Test**: `tests/nft/spike/spike-search-frontend.spec.js`. Simulates concurrent browser-driven searches and rapid typing to measure frontend rendering performance (FCP, DOM timing, search render time) and UI responsiveness.

### Lum Yi Ren Johannsen

**UI Testing (Playwright)**

- **Home Page Filtering**: `tests/ui/HomePageFiltering.spec.ts`. Category filter → Price filter → Reset filters.
- **General Navigation & Error**: `tests/ui/GeneralNavigation.spec.ts`. Header Cart link → Footer About link → Invalid URL (404) → Recovery routing.
- **Mobile Responsiveness**: `tests/ui/ResponsiveMobile.spec.ts`. Mobile viewport → Hamburger menu → Cart navigation.

**Integration Testing (Jest)**

- **Category Backend**: `tests/integration/category/categoryIntegration.test.js`. Validate input (BVA / EP) → Controller → Persist to in-memory MongoDB.
- **Home Page Frontend**: `client/src/pages/HomePageIntegration.test.js`. Stub HTTP → Render page → Hook loads mock data → Assert UI.
- **Payment Backend**: `tests/integration/payment/paymentIntegration.test.js`. Nonce + cart → Stub gateway → Poll DB for order → Gateway failure handling.

### Leong Soon Mun Stephane (A0273409B)

**Stress Testing**

- `tests/stress/login.js`
- `tests/stress/view-products.js`

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## Continuous Integration

1. [MS1 CI](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team30/actions/runs/22283565578/job/64458019580)
2. [MS2_CI](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team30/actions/runs/23426253415)
3. [MS3_CI](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team30/actions/runs/23900821601)
   

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

## 6. AI-Driven Testing Usage

This repository includes an AI-driven test analysis pipeline in [`ai-testing/`](./ai-testing) that is designed to work with CI and post a summary directly onto the pull request.

### CI flow

The intended MS3 workflow is:

1. GitHub Actions runs the Jest and Playwright suites for a push or pull request.
2. Test results are saved as JSON artifacts.
3. GitHub Actions sends a webhook payload to the n8n workflow with the run metadata and parsed test results.
4. The n8n workflow trims the payload, attaches recent failure history, and sends it to Claude for analysis.
5. n8n formats the returned analysis into a human-readable PR summary.
6. If the run belongs to a pull request, n8n posts the summary as a PR comment through the GitHub Issues Comments API.

### What gets posted to the PR

When `pr_number` is present in the webhook payload, the workflow generates a PR comment containing:

- overall health status for the run
- passed, failed, and skipped counts
- per-suite breakdown for backend, frontend, integration, and Playwright UI tests
- failed test classifications with short fix hints
- flaky test warnings based on recent runs
- brittle test warnings
- top priority fixes
- one suggested missing test
- a link back to the originating GitHub Actions run

If the workflow is triggered for a branch build without an associated pull request, it still completes the analysis but skips the PR comment step.

### CI components in this repo

- `ai-testing/n8n-workflow.json`: importable n8n workflow for receiving CI webhook data, calling Claude, formatting the summary, and posting the PR comment
- `ai-testing/system_prompt.txt`: the analysis instructions used by the local Python analyser
- `ai-testing/analyse_results.py`: local analyser used for manual runs and development
- `playwright.config.mjs`: writes Playwright JSON results to `playwright-report/results.json`

### History and flaky test detection

The CI workflow keeps short-term memory of earlier failures so it can flag tests that keep reappearing across recent runs. In the exported n8n workflow, this history is stored in Google Sheets and merged into the Claude request before the PR comment is generated.

### Local usage

The repository also keeps a local analyser for manual inspection outside CI.

1. Install the Python dependency:

   ```bash
   pip install anthropic
   ```

2. Set `ANTHROPIC_API_KEY` in your environment or project `.env`.

3. Generate Jest and Playwright JSON outputs, then run:

   ```bash
   python ai-testing/analyse_results.py
   ```

This local script is useful for debugging the analysis prompt or validating the output format before wiring it into CI, but the main MS3 usage is the automated PR-comment flow above.

## 7. Load Testing with k6

k6 is used for load testing to assess the performance and scalability of the e-commerce platform under various traffic conditions.

This load-testing contribution was implemented by **Alek Kwek, A0273471A**.

### Load Testing Changes Added

- Added dedicated `k6` scenarios for anonymous browsing, authenticated user flows, admin flows, and a mixed end-to-end workload.
- Added shared helpers in `k6/helpers.js` for request headers, response checks, token login, seeded-product selection, and unique test-user generation.
- Added external load profiles in `k6/config.ecom-realistic.json` and `k6/config.ecom-very-high-load.json` so `mixed-flows.js` can be reused for baseline and higher-load runs.
- Added a Docker-based load-testing setup with `Dockerfile.k6` and `docker-compose.k6.yml` to run the backend, MongoDB, admin seeding, and k6 in one isolated workflow.
- Added result export support for JSON summaries and raw output files to make it easier to capture evidence for performance reporting.

### Running Load Tests

1. **Using Docker Compose**

   Copy the Docker env file, then build and run the load test stack:

   ```bash
   cp .env.docker.example .env.docker
   docker compose --env-file .env.docker -f docker-compose.k6.yml build k6
   docker compose --env-file .env.docker -f docker-compose.k6.yml --profile loadtest up --exit-code-from k6 k6
   ```

   If any file inside `k6/` changes, rebuild the `k6` image before running again so the container picks up the latest scripts.

2. **Using k6 Directly**

   Install k6 or use Docker to run load tests:

   ```bash
   # Using Docker
   docker run --rm -v $(pwd)/k6:/scripts grafana/k6:0.55.0 run \
     --summary-export /scripts/summary.json \
     /scripts/mixed-flows.js

   # With custom config
   docker run --rm -v $(pwd)/k6:/scripts grafana/k6:0.55.0 run \
     --summary-export /scripts/summary.json \
     --config /scripts/config.ecom-realistic.json \
     /scripts/mixed-flows.js
   ```

3. **Available Scripts**

   - `mixed-flows.js` - Main reporting scenario with sustained baseline and peak-load stages
   - `anonymous-browsing.js` - Anonymous browsing scenarios
   - `auth-user-flows.js` - Authenticated user scenarios
   - `admin-flows.js` - Admin authentication, order, and category-management scenarios

4. **Config Files**

   - `config.ecom-realistic.json` - Business-hours baseline profile
   - `config.ecom-very-high-load.json` - Higher-load profile for peak probing

5. **Output**

   - Summary exported to `k6/summary.json`
   - Full results in `k6-results/` directory when using Docker Compose

6. **Additional Documentation**

   - See `k6/README.md` for script coverage, thresholds, Docker usage, and workload notes.
