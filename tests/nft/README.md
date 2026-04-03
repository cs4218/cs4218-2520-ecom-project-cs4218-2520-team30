# Non-Functional Testing (NFT) - K6 Spike Tests

**Author:** Tay Kai Jun, A0283343E  
**Module:** CS4218 Software Testing - Milestone 3  
**Test Type:** Spike Testing

## Overview

This directory contains k6 spike tests to measure system behavior under sudden traffic spikes.

## Tests

### 1. Search API Spike Test (`spike-search-k6.js`)

Tests the `/api/v1/product/search/:keyword` endpoint under spike load.

**Scenario:**
- Warm-up: 2 VUs for 10s
- Spike: Ramp to 100 VUs in 10s
- Hold: 100 VUs for 30s
- Recovery: Ramp down to 2 VUs in 10s
- Cool-down: 2 VUs for 20s

### 2. Login API Spike Test (`spike-login-k6.js`) - Flash Sale Scenario

Tests the `/api/v1/auth/login` endpoint simulating a flash sale login rush.

**Scenario:**
- Warm-up: 5 VUs for 5s
- SPIKE: 0 → 500 VUs in 10s (flash sale starts!)
- Hold: 500 VUs for 30s (flash sale duration)
- Recovery: 500 → 50 VUs in 10s
- Cool-down: Ramp to 0 in 10s

**Test User Setup:**
- Automatically creates 50 test users in the setup phase
- Users: `spiketest0@test.com` to `spiketest49@test.com`
- Password: `SpikeTesting123!`
- Users remain in DB for future tests

## Prerequisites

1. **Install k6:**
   ```bash
   # Windows (Chocolatey)
   choco install k6
   
   # macOS (Homebrew)
   brew install k6
   
   # Or download from: https://k6.io/docs/getting-started/installation/
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

## Running Tests

### Run Search Spike Test:
```bash
npm run test:spike-search
# or
k6 run tests/nft/spike-search-k6.js
```

### Run Login Spike Test:
```bash
npm run test:spike-login
# or
k6 run tests/nft/spike-login-k6.js
```

### Custom Server URL:
```bash
k6 run --env BASE_URL=http://localhost:6060 tests/nft/spike-search-k6.js
```

## Metrics Collected

| Metric | Description |
|--------|-------------|
| `P90 Response Time` | 90th percentile response time (key metric) |
| `P95 Response Time` | 95th percentile response time |
| `P99 Response Time` | 99th percentile response time |
| `HTTP Error Rate` | % of requests returning non-200 status |
| `Slow Response Rate` | % of requests exceeding 2s SLA |
| `Throughput` | Requests per second |
| `TTFB (Waiting Time)` | Time to First Byte |
| `Login Success Rate` | % of successful logins (login test only) |
| `Token Received Rate` | % of logins receiving auth token (login test only) |

## Thresholds

### Search API:
- P90 < 1500ms
- P95 < 2000ms
- P99 < 5000ms
- Error rate < 5%
- Success rate > 95%

### Login API:
- P90 < 3000ms
- P95 < 5000ms
- P99 < 10000ms
- Login success > 90%
- Error rate < 10%
- Token received > 85%

## Output Files

After running tests, JSON summaries are saved:
- `tests/nft/spike-search-results.json`
- `tests/nft/spike-login-results.json`

## Cleanup Test Users

To remove spike test users from database:
```javascript
// In MongoDB shell
db.users.deleteMany({ email: /^spiketest.*@test\.com$/ })
```

---
Tay Kai Jun, A0283343E
