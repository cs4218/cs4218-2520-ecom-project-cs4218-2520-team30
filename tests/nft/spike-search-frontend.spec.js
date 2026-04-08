/**
 * Playwright Spike Test - Frontend Search Rendering
 * 
 * Author: Tay Kai Jun, A0283343E
 * Module: CS4218 Software Testing - Milestone 3
 * Test Type: Spike Testing - Frontend Performance (Non-Functional Testing)
 * 
 * Purpose:
 * Simulate multiple concurrent browsers interacting with the Search Bar
 * to measure client-side rendering bottlenecks including:
 * - First Contentful Paint (FCP)
 * - DOM Content Loaded time
 * - Search results rendering time
 * - UI responsiveness under concurrent load
 * 
 * Usage:
 *   1. Start servers first:
 *      Terminal 1: npm start
 *      Terminal 2: npm run client
 *   
 *   2. Run spike test:
 *      npm run test:spike-frontend
 * 
 *   3. View report:
 *      Open tests/nft/spike-report/index.html
 * 
 * Note: This tests FRONTEND rendering performance, not backend API.
 */

// Tay Kai Jun, A0283343E
import { test, expect } from '@playwright/test';

// Configuration - Tay Kai Jun, A0283343E
const BASE_URL = 'http://localhost:3000';
const SEARCH_KEYWORDS = [
  'laptop', 'phone', 'shirt', 'book', 'test',
  'computer', 'watch', 'camera', 'tablet', 'shoes',
  'electronics', 'premium', 'sale', 'product', 'bag',
  'headphones', 'keyboard', 'mouse', 'monitor', 'cable'
];

// Number of concurrent browser tests - Tay Kai Jun, A0283343E
// Note: Each browser uses ~200MB RAM. 10 browsers = ~2GB RAM
// For 100 "virtual users", we run 10 browsers x 10 iterations each
const CONCURRENT_BROWSERS = 10;
const ITERATIONS_PER_BROWSER = 10;

// Metrics storage for final report - Tay Kai Jun, A0283343E
const allMetrics = {
  fcpTimes: [],
  domLoadTimes: [],
  searchRenderTimes: [],
  pageLoadTimes: [],
  errors: [],
};

/**
 * Measure browser performance metrics using Performance API
 * Tay Kai Jun, A0283343E
 */
async function measurePerformanceMetrics(page) {
  return await page.evaluate(() => {
    const perfEntries = performance.getEntriesByType('paint');
    const navEntries = performance.getEntriesByType('navigation');
    
    const fcp = perfEntries.find(e => e.name === 'first-contentful-paint');
    const nav = navEntries[0];
    
    return {
      fcp: fcp ? fcp.startTime : null,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
      pageLoad: nav ? nav.loadEventEnd - nav.startTime : null,
      ttfb: nav ? nav.responseStart - nav.requestStart : null,
    };
  });
}

/**
 * Perform search and measure rendering time
 * Tay Kai Jun, A0283343E
 */
async function performSearchWithMetrics(page, keyword, testId) {
  const metrics = {
    testId,
    keyword,
    fcp: null,
    domLoad: null,
    searchRenderTime: null,
    pageLoad: null,
    success: false,
    error: null,
  };

  try {
    // Navigate to homepage and measure initial load
    // Tay Kai Jun, A0283343E
    const navStart = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    // Measure initial page performance
    const perfMetrics = await measurePerformanceMetrics(page);
    metrics.fcp = perfMetrics.fcp;
    metrics.domLoad = perfMetrics.domContentLoaded;
    metrics.pageLoad = Date.now() - navStart;
    
    // Find the search input - Tay Kai Jun, A0283343E
    const searchInput = page.locator('input[type="search"][placeholder="Search"]');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // Perform search and measure render time
    // Tay Kai Jun, A0283343E
    const searchStart = Date.now();
    
    // Type keyword and submit
    await searchInput.fill(keyword);
    await searchInput.press('Enter');
    
    // Wait for navigation to search results page
    await page.waitForURL('**/search', { timeout: 15000 });
    
    // Wait for search results to render
    await page.waitForSelector('h1:has-text("Search Results")', { timeout: 10000 });
    
    // Calculate search render time
    metrics.searchRenderTime = Date.now() - searchStart;
    metrics.success = true;
    
    console.log(`[Test ${testId}] "${keyword}": FCP=${metrics.fcp?.toFixed(0)}ms, SearchRender=${metrics.searchRenderTime}ms`);
    
  } catch (error) {
    metrics.error = error.message;
    console.log(`[Test ${testId}] ERROR: ${error.message}`);
  }
  
  return metrics;
}

// ============================================================
// SPIKE TEST SCENARIOS - Tay Kai Jun, A0283343E
// ============================================================

test.describe('Frontend Search Spike Test (100 Virtual Users)', () => {
  // Enable parallel execution for spike simulation - Tay Kai Jun, A0283343E
  test.describe.configure({ mode: 'parallel' });
  
  // Generate concurrent browser tests - Tay Kai Jun, A0283343E
  // 10 browsers x 10 iterations = 100 total searches
  for (let i = 0; i < CONCURRENT_BROWSERS; i++) {
    for (let j = 0; j < ITERATIONS_PER_BROWSER; j++) {
      const testNum = i * ITERATIONS_PER_BROWSER + j + 1;
      const keyword = SEARCH_KEYWORDS[testNum % SEARCH_KEYWORDS.length];
      
      test(`VU ${testNum}/100 - Browser ${i + 1} - Search "${keyword}"`, async ({ page }) => {
        // Tay Kai Jun, A0283343E
        test.setTimeout(120000);
        
        const metrics = await performSearchWithMetrics(page, keyword, testNum);
        
        // Store metrics - Tay Kai Jun, A0283343E
        if (metrics.fcp) allMetrics.fcpTimes.push(metrics.fcp);
        if (metrics.domLoad) allMetrics.domLoadTimes.push(metrics.domLoad);
        if (metrics.searchRenderTime) allMetrics.searchRenderTimes.push(metrics.searchRenderTime);
        if (metrics.pageLoad) allMetrics.pageLoadTimes.push(metrics.pageLoad);
        if (metrics.error) allMetrics.errors.push(metrics.error);
        
        // Assertions - Tay Kai Jun, A0283343E
        expect(metrics.success, 'Search should complete successfully').toBe(true);
        expect(metrics.searchRenderTime, 'Search render time should be < 10s').toBeLessThan(10000);
      });
    }
  }
});

// ============================================================
// RAPID SEQUENTIAL SEARCH TEST - Tay Kai Jun, A0283343E
// ============================================================

test.describe('Rapid Sequential Search Spike', () => {
  
  test('10 rapid searches in single browser', async ({ page }) => {
    // Tay Kai Jun, A0283343E
    test.setTimeout(120000);
    
    const searchTimes = [];
    const keywords = ['laptop', 'phone', 'shirt', 'book', 'test', 
                      'computer', 'watch', 'camera', 'tablet', 'shoes'];
    
    // Navigate to homepage first
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('\n========== RAPID SEARCH SPIKE TEST ==========');
    console.log('Author: Tay Kai Jun, A0283343E');
    console.log('Performing 10 rapid sequential searches...\n');
    
    // Perform rapid searches - Tay Kai Jun, A0283343E
    for (let i = 0; i < 10; i++) {
      const keyword = keywords[i];
      const startTime = Date.now();
      
      try {
        const searchInput = page.locator('input[type="search"][placeholder="Search"]');
        await searchInput.waitFor({ state: 'visible', timeout: 5000 });
        
        // Clear and type new keyword
        await searchInput.clear();
        await searchInput.fill(keyword);
        await searchInput.press('Enter');
        
        // Wait for results
        await page.waitForURL('**/search', { timeout: 10000 });
        await page.waitForSelector('h1:has-text("Search Results")', { timeout: 5000 });
        
        const elapsed = Date.now() - startTime;
        searchTimes.push(elapsed);
        console.log(`  Search ${i + 1}: "${keyword}" - ${elapsed}ms`);
        
        // Navigate back for next search
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10000 });
        
      } catch (error) {
        console.log(`  Search ${i + 1}: "${keyword}" - FAILED: ${error.message}`);
        searchTimes.push(-1);
        // Try to recover
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10000 });
      }
    }
    
    // Calculate statistics - Tay Kai Jun, A0283343E
    const validTimes = searchTimes.filter(t => t > 0);
    const avgTime = validTimes.length > 0 
      ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length 
      : 0;
    const maxTime = validTimes.length > 0 ? Math.max(...validTimes) : 0;
    const minTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;
    const successRate = (validTimes.length / 10 * 100).toFixed(0);
    
    console.log('\n========== RESULTS ==========');
    console.log(`  Success Rate:    ${successRate}% (${validTimes.length}/10)`);
    console.log(`  Avg Render Time: ${avgTime.toFixed(0)}ms`);
    console.log(`  Min Render Time: ${minTime}ms`);
    console.log(`  Max Render Time: ${maxTime}ms`);
    console.log('==============================\n');
    
    // Assertions - Tay Kai Jun, A0283343E
    expect(validTimes.length, 'At least 8/10 searches should succeed').toBeGreaterThanOrEqual(8);
    expect(avgTime, 'Average render time should be < 5s').toBeLessThan(5000);
  });
});

// ============================================================
// CORE WEB VITALS MEASUREMENT - Tay Kai Jun, A0283343E
// ============================================================

test.describe('Core Web Vitals During Search', () => {
  
  test('Measure FCP, LCP, and rendering metrics', async ({ page }) => {
    // Tay Kai Jun, A0283343E
    test.setTimeout(60000);
    
    console.log('\n========== CORE WEB VITALS TEST ==========');
    console.log('Author: Tay Kai Jun, A0283343E\n');
    
    // Navigate and measure initial load - Tay Kai Jun, A0283343E
    const navStart = Date.now();
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    const pageLoadTime = Date.now() - navStart;
    
    // Get Core Web Vitals - Tay Kai Jun, A0283343E
    const webVitals = await page.evaluate(() => {
      const metrics = {};
      
      // Paint metrics
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
      if (fcpEntry) metrics.fcp = fcpEntry.startTime;
      
      // Navigation timing
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        metrics.ttfb = nav.responseStart - nav.requestStart;
        metrics.domContentLoaded = nav.domContentLoadedEventEnd - nav.startTime;
        metrics.domInteractive = nav.domInteractive - nav.startTime;
      }
      
      return metrics;
    });
    
    console.log('📊 INITIAL PAGE LOAD METRICS:');
    console.log('-'.repeat(40));
    console.log(`  First Contentful Paint (FCP): ${webVitals.fcp?.toFixed(0) || 'N/A'}ms`);
    console.log(`  Time to First Byte (TTFB):    ${webVitals.ttfb?.toFixed(0) || 'N/A'}ms`);
    console.log(`  DOM Interactive:              ${webVitals.domInteractive?.toFixed(0) || 'N/A'}ms`);
    console.log(`  DOM Content Loaded:           ${webVitals.domContentLoaded?.toFixed(0) || 'N/A'}ms`);
    console.log(`  Total Page Load:              ${pageLoadTime}ms`);
    
    // Perform search and measure - Tay Kai Jun, A0283343E
    const searchInput = page.locator('input[type="search"][placeholder="Search"]');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    
    const searchStart = Date.now();
    await searchInput.fill('laptop');
    await searchInput.press('Enter');
    
    await page.waitForURL('**/search', { timeout: 15000 });
    await page.waitForSelector('h1:has-text("Search Results")', { timeout: 10000 });
    const searchRenderTime = Date.now() - searchStart;
    
    console.log('\n🔍 SEARCH RENDERING METRICS:');
    console.log('-'.repeat(40));
    console.log(`  Search Render Time: ${searchRenderTime}ms`);
    
    // SLA check - Tay Kai Jun, A0283343E
    console.log('\n🎯 SLA CHECK (Based on Google Web Vitals):');
    console.log('-'.repeat(40));
    
    const fcpStatus = webVitals.fcp ? (webVitals.fcp < 1800 ? '✅ GOOD' : webVitals.fcp < 3000 ? '⚠️ NEEDS IMPROVEMENT' : '❌ POOR') : '⚠️ N/A';
    const ttfbStatus = webVitals.ttfb ? (webVitals.ttfb < 800 ? '✅ GOOD' : webVitals.ttfb < 1800 ? '⚠️ NEEDS IMPROVEMENT' : '❌ POOR') : '⚠️ N/A';
    
    console.log(`  FCP < 1800ms:     ${fcpStatus} (${webVitals.fcp?.toFixed(0) || 'N/A'}ms)`);
    console.log(`  TTFB < 800ms:     ${ttfbStatus} (${webVitals.ttfb?.toFixed(0) || 'N/A'}ms)`);
    console.log(`  Search < 3000ms:  ${searchRenderTime < 3000 ? '✅ GOOD' : '⚠️ SLOW'} (${searchRenderTime}ms)`);
    
    console.log('\n==========================================\n');
    
    // Assertions - Tay Kai Jun, A0283343E
    // FCP may not always be available in performance entries, so check if defined
    if (webVitals.fcp !== undefined) {
      expect(webVitals.fcp, 'FCP should be < 3000ms').toBeLessThan(3000);
    }
    expect(searchRenderTime, 'Search render should be < 5000ms').toBeLessThan(5000);
  });
});

// ============================================================
// STRESS TEST - MULTIPLE RAPID SEARCHES - Tay Kai Jun, A0283343E
// ============================================================

test.describe('Search UI Stress Test', () => {
  
  test('Type-ahead stress: rapid typing simulation', async ({ page }) => {
    // Tay Kai Jun, A0283343E
    test.setTimeout(60000);
    
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    
    const searchInput = page.locator('input[type="search"][placeholder="Search"]');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('\n========== TYPE-AHEAD STRESS TEST ==========');
    console.log('Simulating rapid typing to test UI responsiveness...\n');
    
    // Simulate rapid typing - Tay Kai Jun, A0283343E
    const testPhrase = 'laptop computer electronics';
    const startTime = Date.now();
    
    // Type character by character with minimal delay
    for (const char of testPhrase) {
      await searchInput.press(char);
      await page.waitForTimeout(50); // 50ms between keystrokes
    }
    
    const typingTime = Date.now() - startTime;
    
    // Check if UI is still responsive
    const inputValue = await searchInput.inputValue();
    
    console.log(`  Typed: "${testPhrase}"`);
    console.log(`  Input Value: "${inputValue}"`);
    console.log(`  Typing Duration: ${typingTime}ms`);
    console.log(`  UI Responsive: ${inputValue === testPhrase ? '✅ Yes' : '⚠️ Input mismatch'}`);
    console.log('=============================================\n');
    
    // Assertions - Tay Kai Jun, A0283343E
    expect(inputValue, 'Input should capture all keystrokes').toBe(testPhrase);
    expect(typingTime, 'Typing should complete within reasonable time').toBeLessThan(10000);
  });
});
