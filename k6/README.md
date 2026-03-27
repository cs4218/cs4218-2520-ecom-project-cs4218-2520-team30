# k6 Load Testing Scripts

These scripts target the Express backend directly at `http://localhost:6060`, which matches the frontend proxy behavior in this repo.

## Files

- `k6/anonymous-browsing.js`: anonymous catalog browsing and product reads
- `k6/auth-user-flows.js`: register, login, user-auth, profile update, orders
- `k6/admin-flows.js`: admin-auth, all-orders, order-status, category CRUD, product list
- `k6/mixed-flows.js`: mostly anonymous traffic, with smaller user and admin portions
- `k6/helpers.js`: small shared helpers for checks, headers, and login

## Before Running

1. Start the backend on port `6060`.
2. Make sure the database has at least one product and category if you want the product detail, related product, search, and photo steps to execute fully.
3. For admin tests, set an existing admin account:

```bash
export K6_ADMIN_EMAIL="admin@test.sg"
export K6_ADMIN_PASSWORD="admin@test.sg"
```

## Run Commands

```bash
k6 run k6/anonymous-browsing.js
k6 run k6/auth-user-flows.js
k6 run k6/admin-flows.js
k6 run k6/mixed-flows.js
```

If your backend is not on `localhost:6060`, override it:

```bash
K6_BASE_URL="http://localhost:6060" k6 run k6/anonymous-browsing.js
```

You can also relax or tighten the response-time checks:

```bash
K6_MAX_DURATION_MS=3000 k6 run k6/mixed-flows.js
```

## What Each Script Covers

### Anonymous

- `GET /api/v1/category/get-category`
- `GET /api/v1/product/product-count`
- `GET /api/v1/product/product-list/1`
- `GET /api/v1/product/get-product/:slug`
- `GET /api/v1/product/related-product/:pid/:cid`
- `GET /api/v1/product/product-photo/:pid`
- `POST /api/v1/product/product-filters`
- `GET /api/v1/product/search/:keyword`

### Authenticated User

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/user-auth`
- `PUT /api/v1/auth/profile`
- `GET /api/v1/auth/orders`

### Admin

- `GET /api/v1/auth/admin-auth`
- `GET /api/v1/auth/all-orders`
- `PUT /api/v1/auth/order-status/:orderId`
- `POST /api/v1/category/create-category`
- `PUT /api/v1/category/update-category/:id`
- `DELETE /api/v1/category/delete-category/:id`
- `GET /api/v1/product/get-product`

## Notes And Limitations

- The admin script uses `setup()` because it needs a valid admin token before the test starts.
- The mixed script only runs admin operations if `K6_ADMIN_EMAIL` and `K6_ADMIN_PASSWORD` are set.
- The user and mixed scripts create new users every iteration to keep the register flow realistic and avoid duplicate-email clashes.
- `order-status` is only exercised when `GET /api/v1/auth/all-orders` returns at least one order.
- Braintree endpoints are intentionally excluded from load testing. Payment flows depend on external sandbox behavior and are better treated as smoke tests, not sustained load targets.
- `k6` is not listed in this repo's `package.json`, so install it separately before running these scripts.
