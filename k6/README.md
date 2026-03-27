# k6 Load Testing Scripts

## Workload

**Alek Kwek, A0273471A** — Load Testing via k6

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

## Docker Run

If you want to run the app and `k6` through Docker instead of your host Node setup:

1. Copy the example env file:

```bash
cp .env.docker.example .env.docker
```

The example file constrains Docker to a cheap-EC2-like profile by default:

- `APP_PLATFORM=linux/amd64`
- `APP_CPUS=2`
- `APP_MEM_LIMIT=2g`
- `MONGO_CPUS=1`
- `MONGO_MEM_LIMIT=1g`
- `K6_CPUS=1`
- `K6_MEM_LIMIT=512m`

That does not make your M1 Pro identical to EC2, but it avoids using full local hardware and makes the environment easier to explain in a report.

2. Start MongoDB and the app:

```bash
docker compose --env-file .env.docker -f docker-compose.k6.yml up --build -d app
```

3. Seed the default admin account used by the admin and mixed scripts:

```bash
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm seed-admin
```

4. Run any `k6` script from the container:

```bash
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm k6 run /scripts/mixed-flows.js
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm k6 run /scripts/anonymous-browsing.js
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm k6 run /scripts/auth-user-flows.js
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm k6 run /scripts/admin-flows.js
```

The Docker `k6` container targets `http://app:6060`, so it can talk to the backend service over the Compose network.

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
