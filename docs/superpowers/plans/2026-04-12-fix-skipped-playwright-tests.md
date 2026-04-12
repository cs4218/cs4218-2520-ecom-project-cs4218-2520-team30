# Fix Skipped Playwright Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make three previously-skipped Playwright tests run and pass deterministically in CI by expanding the product seed, routing TC4 to a known product URL, and adding a fully-mocked PayPal checkout test.

**Architecture:** Seed expansion ensures the homepage always has > 6 products (triggering Load More) and that a known product slug always has similar-product siblings. The PayPal mock replaces the real PayPal JS SDK and Braintree API calls with `page.route()` intercepts so no external credentials are needed.

**Tech Stack:** Playwright `^1.44.0`, `braintree-web@3.99.0`, `braintree-web-drop-in-react@1.2.1`, MongoDB in-memory via `MongoMemoryServer`, Node.js `Buffer` for base64 encoding.

---

## File Map

| File | Change |
|------|--------|
| `tests/uiTestUtils.js` | Add 3 products to `PLAYWRIGHT_SEED_PRODUCTS` array |
| `tests/ui/browsing.spec.ts` | TC7: remove `test.skip()` guard; TC4: replace homepage nav with direct URL + hard assert |
| `tests/ui/cart.spec.ts` | Add `MOCK_BRAINTREE_*` constants + helper + new mocked PayPal test |

---

## Task 1: Expand the product seed (prerequisite for TC7 and TC4)

**Files:**
- Modify: `tests/uiTestUtils.js` (around line 69 — the `PLAYWRIGHT_SEED_PRODUCTS` array)

The page size is hardcoded at 6 (`controllers/productController.js:268`). We currently seed 4 products. Adding 3 more in `playwright-seeded-category` (same category as Alpha, Beta, NUS T-shirt) brings the total to 7, guaranteeing Load More appears. It also gives Alpha Product at least 5 siblings, guaranteeing similar products for TC4.

- [ ] **Step 1: Add three products to the seed array**

In `tests/uiTestUtils.js`, find the closing `];` of `PLAYWRIGHT_SEED_PRODUCTS` (currently after the NUS T-shirt entry at ~line 106) and add before it:

```js
  {
    slug: "playwright-delta-product",
    name: "Playwright Delta Product",
    description: "A seeded Playwright delta item for load-more coverage.",
    price: 39,
    quantity: 6,
    shipping: true,
    categorySlug: PLAYWRIGHT_SEED_CATEGORY_SLUG
  },
  {
    slug: "playwright-epsilon-product",
    name: "Playwright Epsilon Product",
    description: "A seeded Playwright epsilon item for load-more coverage.",
    price: 49,
    quantity: 4,
    shipping: false,
    categorySlug: PLAYWRIGHT_SEED_CATEGORY_SLUG
  },
  {
    slug: "playwright-zeta-product",
    name: "Playwright Zeta Product",
    description: "A seeded Playwright zeta item for load-more coverage.",
    price: 59,
    quantity: 3,
    shipping: true,
    categorySlug: PLAYWRIGHT_SEED_CATEGORY_SLUG
  },
```

After the edit the array has 7 entries: Alpha, Beta, Gamma, NUS T-shirt, Delta, Epsilon, Zeta.

- [ ] **Step 2: Verify the seed file parses without syntax errors**

```bash
node -e "import('./tests/uiTestUtils.js').then(() => console.log('OK'))"
```

Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add tests/uiTestUtils.js
git commit -m "test: expand playwright seed to 7 products for load-more and similar-products coverage"
```

---

## Task 2: Fix TC7 — remove runtime skip guard

**Files:**
- Modify: `tests/ui/browsing.spec.ts` (lines 208–210)

Now that the seed guarantees > 6 products, the Load More button is always present. The `test.skip()` guard is dead code.

- [ ] **Step 1: Remove the guard**

In `tests/ui/browsing.spec.ts`, replace:

```typescript
    const loadMore = page.getByRole("button", { name: /Loadmore/i });
    if (!(await loadMore.isVisible())) {
      test.skip();
      return;
    }

    const countBefore = await productCards.count();
```

with:

```typescript
    const loadMore = page.getByRole("button", { name: /Loadmore/i });
    await expect(loadMore).toBeVisible({ timeout: 10000 });

    const countBefore = await productCards.count();
```

- [ ] **Step 2: Run TC7 alone and confirm it passes**

```bash
npx playwright test tests/ui/browsing.spec.ts --grep "TC7" --config playwright.config.mjs
```

Expected: 1 passed, 0 skipped.

- [ ] **Step 3: Commit**

```bash
git add tests/ui/browsing.spec.ts
git commit -m "test: remove runtime test.skip guard from TC7 — seed now guarantees Load More"
```

---

## Task 3: Fix TC4 — navigate directly to known product URL

**Files:**
- Modify: `tests/ui/browsing.spec.ts` (lines 94–130, the TC4 test body)

TC4 previously clicked the first homepage product card, which could be `playwright-gamma-product` (the only product in `playwright-alt-category`). With no siblings, the test skipped. Fix: navigate directly to `/product/playwright-alpha-product`, which always has siblings in `playwright-seeded-category`.

- [ ] **Step 1: Replace the homepage navigation preamble and remove the skip guard**

In `tests/ui/browsing.spec.ts`, inside TC4, replace everything from the opening `await page.goto("/");` through the end of the `if (!(await similarMoreDetails.isVisible()))` block with:

```typescript
    // Navigate directly to a seeded product guaranteed to have similar products
    await page.goto("/product/playwright-alpha-product");
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible({ timeout: 10000 });

    const similarMoreDetails = page
      .locator(".similar-products")
      .getByRole("button", { name: "More Details" })
      .first();
    await expect(similarMoreDetails).toBeVisible({ timeout: 15000 });
```

The rest of the test body (reading `relatedName`, clicking `similarMoreDetails`, asserting the new URL and product name) is **unchanged**.

- [ ] **Step 2: Run TC4 alone and confirm it passes**

```bash
npx playwright test tests/ui/browsing.spec.ts --grep "TC4" --config playwright.config.mjs
```

Expected: 1 passed, 0 skipped.

- [ ] **Step 3: Run the full browsing suite to confirm no regressions**

```bash
npx playwright test tests/ui/browsing.spec.ts --config playwright.config.mjs
```

Expected: 7 passed, 0 skipped, 0 failed.

- [ ] **Step 4: Commit**

```bash
git add tests/ui/browsing.spec.ts
git commit -m "test: fix TC4 to navigate directly to known product URL, remove runtime skip"
```

---

## Task 4: Add the mocked PayPal checkout test

**Files:**
- Modify: `tests/ui/cart.spec.ts` (add constants near top, add helper function, add new test)

### Background on the mock chain

The Drop-in (`braintree-web-drop-in-react@1.2.1` / `braintree-web@3.99.0`) performs these network calls in order:

1. React CartPage mounts → `GET /api/v1/product/braintree/token` → returns `clientToken`
2. Drop-in decodes `clientToken` → reads `configUrl` → `GET configUrl` → returns gateway config
3. Drop-in reads `paypal.clientId` from config → loads `GET https://www.paypal.com/sdk/js?client-id=...` → PayPal JS SDK
4. User clicks PayPal option + PayPal button → Drop-in calls `createOrder` → `POST .../paypal_hermes/setup_billing_agreement` → billing token
5. Our mock PayPal SDK fires `onApprove({ billingToken, payerID })` immediately (no popup)
6. Drop-in calls `tokenizePayment` → `POST .../payment_methods/paypal_accounts` → nonce
7. CartPage `handlePayment` → `POST /api/v1/product/braintree/payment` → success → navigate to orders

`environmentNoNetwork: true` must NOT be set in the Braintree config — in `braintree-web@3.99.0` it triggers a `PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED` BraintreeError.

- [ ] **Step 1: Add the shared mock constants near the top of `cart.spec.ts`**

After the existing imports and before the `generateTestUser` function, add:

```typescript
// ─── Braintree / PayPal mock constants ───────────────────────────────────────

const FAKE_MERCHANT_ID = "fake-merchant";

const FAKE_CLIENT_TOKEN = Buffer.from(
  JSON.stringify({
    version: 2,
    authorizationFingerprint: "fake-fingerprint-for-testing",
    configUrl: `https://api.braintreegateway.com/merchants/${FAKE_MERCHANT_ID}/client_api/v1/configuration`,
  })
).toString("base64");

const FAKE_BRAINTREE_CONFIG = {
  analyticsUrl: `https://origin-analytics-sand.sandbox.braintree-api.com/${FAKE_MERCHANT_ID}`,
  assetsUrl: "https://assets.braintreegateway.com",
  clientApiUrl: `https://api.braintreegateway.com/merchants/${FAKE_MERCHANT_ID}/client_api`,
  analytics: { url: `https://origin-analytics-sand.sandbox.braintree-api.com/${FAKE_MERCHANT_ID}` },
  challenges: [],
  creditCards: { supportedCardTypes: [] },
  paypal: {
    displayName: "Test Store",
    clientId: "fake-paypal-client-id",
    assetsUrl: "https://checkout.paypal.com",
    currencyCode: "USD",
    environment: "sandbox",
    allowHttp: false,
    unvettedMerchant: false,
  },
  paypalEnabled: true,
  applePayWeb: null,
  googlePay: null,
  threeDSecure: null,
  environment: "sandbox",
  merchantId: FAKE_MERCHANT_ID,
  version: "3.99.0",
};

// Minimal PayPal JS SDK stub — renders a real button that fires onApprove
// immediately on click without opening a popup.
// The button gets data-testid="mock-paypal-btn" for unambiguous targeting.
const MOCK_PAYPAL_SDK_JS = `
(function() {
  window.paypal = {
    version: '5.0.0',
    FUNDING: { PAYPAL: 'paypal', CREDIT: 'credit', CARD: 'card' },
    Buttons: function(opts) {
      return {
        isEligible: function() { return true; },
        render: function(container) {
          var el = typeof container === 'string'
            ? document.querySelector(container)
            : container;
          if (!el) return Promise.resolve();
          while (el.firstChild) { el.removeChild(el.firstChild); }
          var btn = document.createElement('button');
          btn.setAttribute('data-testid', 'mock-paypal-btn');
          btn.setAttribute('type', 'button');
          btn.style.cssText = 'width:100%;padding:14px;background:#0070ba;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:16px;margin-top:8px;';
          btn.textContent = 'PayPal';
          btn.addEventListener('click', function() {
            var createFn = opts.createOrder || function() { return Promise.resolve('fake-billing-token-abc'); };
            Promise.resolve(createFn()).then(function(token) {
              return opts.onApprove({
                billingToken: token,
                orderID: token,
                payerID: 'FakePayerID12345'
              });
            }).catch(function(err) { console.error('[mock-paypal] onApprove error', err); });
          });
          el.appendChild(btn);
          return Promise.resolve();
        }
      };
    }
  };
})();
`;
```

- [ ] **Step 2: Add the `setupBraintreePayPalMocks` helper function**

After the `MOCK_PAYPAL_SDK_JS` constant (and before the `interface TestUser` declaration), add:

```typescript
async function setupBraintreePayPalMocks(page: Page): Promise<void> {
  // 1. Backend token endpoint → fake clientToken
  await page.route("**/api/v1/product/braintree/token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ clientToken: FAKE_CLIENT_TOKEN }),
    });
  });

  // 2. Braintree gateway configuration (no environmentNoNetwork — that triggers an error)
  await page.route("**/api.braintreegateway.com/**/configuration**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FAKE_BRAINTREE_CONFIG),
    });
  });

  // 3. PayPal JS SDK script → stub that fires onApprove on click, no popup
  await page.route("**/paypal.com/sdk/js**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: MOCK_PAYPAL_SDK_JS,
    });
  });

  // 4. Braintree billing agreement → fake billing token
  await page.route("**/paypal_hermes/setup_billing_agreement**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        agreementSetup: { tokenId: "fake-billing-token-abc" },
      }),
    });
  });

  // 5. Braintree PayPal tokenization → fake nonce
  await page.route("**/payment_methods/paypal_accounts**", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        paypalAccounts: [
          {
            nonce: "fake-paypal-nonce-xyz",
            type: "PayPalAccount",
            description: "PayPal",
            details: {
              email: "test@example.com",
              payerId: "FakePayerID12345",
              firstName: "Test",
              lastName: "User",
            },
          },
        ],
      }),
    });
  });

  // 6. Backend payment endpoint → immediate success
  await page.route("**/api/v1/product/braintree/payment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}
```

- [ ] **Step 3: Add the new test inside the `describe` block**

Inside `test.describe("Cart shopping flow E2E", ...)`, add the new test **after** the existing `"should complete checkout with PayPal sandbox..."` test (around line 470):

```typescript
  test("should complete checkout with mocked PayPal and navigate to All Orders", async ({
    page,
    request,
  }) => {
    // Basil Boh A0273232M
    test.setTimeout(120000);

    // Routes MUST be registered before navigation — the token fetch happens on CartPage mount.
    await setupBraintreePayPalMocks(page);

    await setupLoggedInUserWithItemInCart(page, request, "_paypal_mocked");

    // Wait for the Braintree Drop-in container to appear (uses our mocked token)
    await expect(
      page.locator(".braintree-dropin-container, [class*='braintree-dropin']").first()
    ).toBeVisible({ timeout: 30000 });

    // Open the PayPal payment sheet inside the Drop-in
    const paypalOption = page.locator(".braintree-option__paypal").first();
    await expect(paypalOption).toBeVisible({ timeout: 20000 });
    await paypalOption.click();

    // Wait for our mock PayPal button rendered by the stub SDK
    const mockPaypalBtn = page.locator('[data-testid="mock-paypal-btn"]');
    await expect(mockPaypalBtn).toBeVisible({ timeout: 30000 });
    await mockPaypalBtn.click();

    // Drop-in needs a moment to process onApprove and enable the Make Payment button
    const payButton = page.getByRole("button", { name: "Make Payment" });
    await expect(payButton).toBeEnabled({ timeout: 30000 });
    await page.waitForTimeout(500);
    await payButton.click();

    await expect(page.getByText("Payment Completed Successfully")).toBeVisible({
      timeout: 30000,
    });
    await expect(page).toHaveURL(/\/dashboard\/user\/orders/, { timeout: 20000 });
    await expect(
      page.getByRole("heading", { name: "All Orders" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".ant-badge")).toContainText("0");
  });
```

- [ ] **Step 4: Run the new test alone**

```bash
npx playwright test tests/ui/cart.spec.ts --grep "mocked PayPal" --config playwright.config.mjs
```

Expected: 1 passed, 0 failed.

**If the Drop-in does not render the PayPal option:** open the Playwright HTML report (`npx playwright show-report`) and inspect the trace. Look for which `page.route()` intercept fired. If the Braintree config route never fired, widen the pattern to `**/braintreegateway.com/**` and add a URL log to identify the exact path.

**If `[data-testid="mock-paypal-btn"]` never appears:** the PayPal SDK route did not match. In the trace, look for the SDK script URL; adjust `**/paypal.com/sdk/js**` to match. For example, if it loads from `www.paypal.com`, the pattern already covers it; if from `sdk.paypal.com`, change to `**/paypal.com/**`.

- [ ] **Step 5: Run the full cart suite to confirm no regressions**

```bash
npx playwright test tests/ui/cart.spec.ts --config playwright.config.mjs
```

Expected: all existing tests still pass, new test passes, real PayPal sandbox test skips (env vars absent).

- [ ] **Step 6: Commit**

```bash
git add tests/ui/cart.spec.ts
git commit -m "test: add mocked PayPal checkout test using page.route() Braintree/PayPal intercepts"
```

---

## Task 5: Full suite smoke check

- [ ] **Step 1: Run all Playwright tests**

```bash
npx playwright test --config playwright.config.mjs
```

Expected: previously 72 passed / 3 skipped → now **75 passed / 1 skipped** (only the real PayPal sandbox test skips). 0 failed.

- [ ] **Step 2: Commit updated spec**

```bash
git add docs/superpowers/specs/2026-04-12-fix-skipped-playwright-tests-design.md
git commit -m "docs: correct paypal mock approach in spec — environmentNoNetwork causes error in braintree-web 3.99.0"
```
