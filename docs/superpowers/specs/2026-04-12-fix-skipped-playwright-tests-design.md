# Fix Skipped Playwright Tests — Design Spec

**Date:** 2026-04-12  
**Status:** Approved  
**Scope:** Three skipped/brittle Playwright tests in `tests/ui/`

---

## Problem Summary

Three Playwright tests are unconditionally or conditionally skipped due to non-deterministic database state or missing external credentials:

| Test | File | Root cause |
|------|------|------------|
| TC7: should load more products when Loadmore is available | `browsing.spec.ts` | Only 4 products seeded; page size is 6 → Load More never renders |
| TC4: should navigate from similar product to another product details page | `browsing.spec.ts` | First homepage product may be the only product in its category (Gamma) → no similar products |
| should complete checkout with PayPal sandbox and navigate to All Orders | `cart.spec.ts` | PayPal sandbox credentials absent in CI → no-op runtime skip |

---

## Fix 1 — TC7: Load More (seed expansion)

### Change: `tests/uiTestUtils.js`

Add 3 new products to `PLAYWRIGHT_SEED_PRODUCTS`, all in `playwright-seeded-category`. This brings total seeded products from 4 to 7, which exceeds the backend page size of 6 (`controllers/productController.js:268`), guaranteeing the Load More button appears on the homepage.

New products:
- `playwright-delta-product` — price 39, qty 6, shipping true
- `playwright-epsilon-product` — price 49, qty 4, shipping false
- `playwright-zeta-product` — price 59, qty 3, shipping true

### Change: `tests/ui/browsing.spec.ts`

Remove the runtime `test.skip()` guard at lines 208–210:
```typescript
// REMOVE:
if (!(await loadMore.isVisible())) {
  test.skip();
  return;
}
```

The `loadMore` button is now always visible because the seed guarantees > 6 products. The assertion `expect.poll(() => productCards.count()).toBeGreaterThan(countBefore)` is unchanged.

---

## Fix 2 — TC4: Similar Products Navigation (direct URL)

### Change: `tests/ui/browsing.spec.ts`

Replace the homepage-navigation preamble with a direct navigation to a known product URL. `playwright-alpha-product` is always seeded in `playwright-seeded-category` alongside `playwright-beta-product`, `playwright-delta-product`, `playwright-epsilon-product`, `playwright-zeta-product`, and `NUS T-shirt`. After Fix 1, Alpha has at least 5 siblings in the same category, so similar products are guaranteed.

**Before (lines 98–117):**
```typescript
await page.goto("/");
await expect(page.locator(".home-page .col-md-9 .card-title").first()).toBeVisible({ timeout: 10000 });
await page.getByRole("button", { name: "More Details" }).first().click();
await expect(page.getByRole("heading", { name: "Product Details" })).toBeVisible({ timeout: 10000 });

const similarMoreDetails = page.locator(".similar-products").getByRole("button", { name: "More Details" }).first();

if (!(await similarMoreDetails.isVisible())) {
  test.skip();
  return;
}
```

**After:**
```typescript
// Navigate directly to a seeded product that always has siblings in its category
await page.goto("/product/playwright-alpha-product");
await expect(page.getByRole("heading", { name: "Product Details" })).toBeVisible({ timeout: 10000 });

const similarMoreDetails = page.locator(".similar-products").getByRole("button", { name: "More Details" }).first();
await expect(similarMoreDetails).toBeVisible({ timeout: 15000 });
```

The `test.skip()` guard is removed; a hard `expect` assertion replaces it. The rest of the test (click "More Details" on a similar product, assert URL and name) is unchanged.

---

## Fix 3 — PayPal: Mocked Checkout Test

### Overview

The existing `"should complete checkout with PayPal sandbox..."` test is **not changed** — its `process.env` guard is correct. A **new test** is added in the same `describe` block in `cart.spec.ts`:

`"should complete checkout with mocked PayPal and navigate to All Orders"`

This test uses `page.route()` to intercept all Braintree and backend payment calls, enabling the Braintree Drop-in to render in offline/mock mode and complete the PayPal flow without real credentials.

### Four `page.route()` intercepts

#### 1. Backend token endpoint
```
GET **/api/v1/product/braintree/token
→ { clientToken: FAKE_CLIENT_TOKEN }
```
`FAKE_CLIENT_TOKEN` is a base64-encoded JSON:
```json
{
  "version": 2,
  "authorizationFingerprint": "fake-fingerprint",
  "configUrl": "https://api.braintreegateway.com/merchants/fake-merchant/client_api/v1/configuration"
}
```

#### 2. Braintree configuration endpoint
```
GET **/api.braintreegateway.com/**/configuration
→ Minimal Braintree client config JSON
```
Key field: `"paypal": { "environmentNoNetwork": true }` — this tells the Drop-in to operate in offline/test mode, resolving `requestPaymentMethod()` without opening a real PayPal popup.

Full config shape:
```json
{
  "analyticsUrl": "",
  "assetsUrl": "https://assets.braintreegateway.com",
  "clientApiUrl": "https://api.braintreegateway.com/merchants/fake-merchant/client_api",
  "challenges": [],
  "creditCards": { "supportedCardTypes": [] },
  "paypal": {
    "displayName": "Test Store",
    "clientId": "fake-client-id",
    "assetsUrl": "https://assets.braintreegateway.com",
    "currencyIsoCode": "USD",
    "environment": "offline",
    "environmentNoNetwork": true,
    "allowHttp": true,
    "unvettedMerchant": false
  },
  "applePayWeb": null,
  "googlePay": null,
  "threeDSecure": null,
  "environment": "sandbox",
  "version": "3.94.0"
}
```

#### 3. PayPal nonce endpoint
```
POST **/client_api/v1/payment_methods/paypal_accounts
→ { "paypalAccounts": [{ "nonce": "fake-paypal-nonce", "type": "PayPalAccount", "details": {} }] }
```
This is called by the Drop-in when `requestPaymentMethod()` resolves in offline mode.

#### 4. Backend payment endpoint
```
POST **/api/v1/product/braintree/payment
→ { success: true }
```

### Test flow

1. Set up all four `page.route()` intercepts (must happen before any navigation so the token fetch on CartPage mount is intercepted)
2. Register user via API, log in, add first product to cart, navigate to `/cart`
3. Wait for Braintree Drop-in container to appear
4. Click `.braintree-option__paypal`, wait for `[data-braintree-id="paypal-button"]` to render
5. Click PayPal button — Drop-in resolves nonce offline (no popup)
6. Wait for "Make Payment" button to be enabled
7. Click "Make Payment"
8. Assert: URL matches `/dashboard/user/orders`, "All Orders" heading visible, success toast visible, cart badge shows `0`

### Fallback
If `environmentNoNetwork: true` causes the Drop-in to still open a popup (implementation detail of braintree-web version), add before step 7:
```typescript
page.waitForEvent('popup', { timeout: 5000 })
  .then(popup => popup.close())
  .catch(() => {});
```

---

## Files Changed

| File | Change |
|------|--------|
| `tests/uiTestUtils.js` | Add 3 products to `PLAYWRIGHT_SEED_PRODUCTS` |
| `tests/ui/browsing.spec.ts` | TC4: replace homepage navigation with direct URL + hard assert; TC7: remove `test.skip()` guard |
| `tests/ui/cart.spec.ts` | Add new mocked PayPal test with 4 `page.route()` intercepts |

---

## Testing Criteria

- All 3 previously-skipped tests now run and pass in CI
- Existing passing tests are unaffected (seed additions are additive; existing tests don't assume a specific product count)
- The real PayPal sandbox test still skips correctly when `PAYPAL_SANDBOX_EMAIL` is absent
