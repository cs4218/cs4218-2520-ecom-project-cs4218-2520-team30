# k6 Load Testing Scripts

## Workload

**Alek Kwek, A0273471A** — Load Testing via k6

These scripts target the Express backend directly at `http://localhost:6060`, which matches the frontend proxy behavior in this repo.

## Files

### Scripts

- `k6/anonymous-browsing.js` — anonymous catalog browsing and product reads
- `k6/auth-user-flows.js` — register, login, user-auth, profile update, orders
- `k6/admin-flows.js` — admin-auth, all-orders, order-status, category CRUD, product list
- `k6/mixed-flows.js` — full authenticated user journey (browse → login → checkout init); main script for MS3 reporting
- `k6/helpers.js` — shared helpers for checks, headers, and login

### Config Files

- `k6/config.ecom-realistic.json` — business-hours profile: 5 min baseline at 30 VUs, 3 min peak at 60 VUs
- `k6/config.ecom-very-high-load.json` — high-load profile: 7 min sustained at 100 VUs (ramping-vus executor)

## Before Running

1. Start the backend on port `6060`.
2. Make sure the database has at least one product and category if you want the product detail, related product, search, and photo steps to execute fully.
3. For admin tests, set an existing admin account:

```bash
export K6_ADMIN_EMAIL="admin@test.sg"
export K6_ADMIN_PASSWORD="admin@test.sg"
```

## Run Commands

### Local (k6 installed on host)

```bash
# Run individual scripts with their built-in load profile
k6 run k6/anonymous-browsing.js
k6 run k6/auth-user-flows.js
k6 run k6/admin-flows.js
k6 run k6/mixed-flows.js
```

Override the base URL if your backend is not on `localhost:6060`:

```bash
K6_BASE_URL="http://localhost:6060" k6 run k6/mixed-flows.js
```

### Running mixed-flows.js with an external JSON config

`mixed-flows.js` defaults to a 40-VU baseline. To override the load profile
without editing the script, pass `EXTERNAL_CONFIG=true` and point to a
JSON config file with `--config`:

```bash
# Business-hours profile (30 VU baseline, 60 VU peak)
k6 run -e EXTERNAL_CONFIG=true \
    --config k6/config.ecom-realistic.json \
    k6/mixed-flows.js

# High-load profile (100 VUs sustained for 7 minutes)
k6 run -e EXTERNAL_CONFIG=true \
    --config k6/config.ecom-very-high-load.json \
    k6/mixed-flows.js
```

> **Why `EXTERNAL_CONFIG=true`?** k6 merges `--config` with the script-level
> `options`, so a script's `stages` would override the JSON file. Setting this
> env var clears the script options so the JSON config takes full control.

## Load Profile

### Built-in profiles (no config file needed)

| Script | Peak VUs | Total duration |
| --- | --- | --- |
| `anonymous-browsing.js` | **100** | ~5 min |
| `auth-user-flows.js` | **30** | ~5 min |
| `admin-flows.js` | **10** | ~5 min |
| `mixed-flows.js` | **40** | ~11 min |

### External config profiles (`mixed-flows.js` only)

| Config file | Peak VUs | Total duration | Use case |
| --- | --- | --- | --- |
| `config.ecom-realistic.json` | **60** | ~16 min | Business-hours baseline |
| `config.ecom-very-high-load.json` | **100** | ~11 min | Peak/stress probe |

### Thresholds (`mixed-flows.js`)

- `p(95) < 200 ms` (Google RAIL model)
- error rate `< 1 %`
- check pass rate `> 99 %`

## Docker Run

If you want to run the app and `k6` through Docker instead of your host Node setup:

> **⚠️ Important — rebuild the k6 image after any change to `k6/`**
>
> The k6 Docker image bakes in a copy of the `k6/` folder at build time.
> If you edit a script, add a config file, or change `helpers.js`, the running
> container will still use the **old** files until you rebuild:
>
> ```bash
> docker compose --env-file .env.docker -f docker-compose.k6.yml build k6
> ```
>
> Skipping this is the most common reason config changes appear to have no effect.

1. Copy the example env file:

```bash
cp .env.docker.example .env.docker
```

The example file constrains Docker to a cheap-EC2-like profile by default
(`APP_CPUS=2`, `APP_MEM_LIMIT=2g`, `K6_CPUS=1`, `K6_MEM_LIMIT=512m`), which
represents a typical low-cost cloud instance.

1. Start MongoDB and the app:

```bash
docker compose --env-file .env.docker -f docker-compose.k6.yml up --build -d app
```

1. Seed the default admin account:

```bash
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm seed-admin
```

1. **(Important)** Rebuild the k6 image whenever you add or change files in `k6/`:

```bash
docker compose --env-file .env.docker -f docker-compose.k6.yml build k6
```

1. Run scripts:

```bash
# Built-in load profile (default)
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm \
  k6 run /scripts/mixed-flows.js

# Other scripts
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm \
  k6 run /scripts/anonymous-browsing.js
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm \
  k6 run /scripts/auth-user-flows.js
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm \
  k6 run /scripts/admin-flows.js
```

1. Run `mixed-flows.js` with an external JSON config:

```bash
# Default profile 
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm \
  k6 run /scripts/mixed-flows.js
```

```bash
# Business-hours profile
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm \
  k6 run \
  -e EXTERNAL_CONFIG=true \
  --config /scripts/config.ecom-realistic.json \
  /scripts/mixed-flows.js

# High-load profile (100 VUs)
docker compose --env-file .env.docker -f docker-compose.k6.yml run --rm \
  k6 run \
  -e EXTERNAL_CONFIG=true \
  --config /scripts/config.ecom-very-high-load.json \
  /scripts/mixed-flows.js
```

The Docker `k6` container targets `http://app:6060` over the Compose network.

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
