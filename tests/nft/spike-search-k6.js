/**
 * Spike Test for Search API - Frontend Search Rendering Performance
 * 
 * Author: Tay Kai Jun, A0283343E
 * Module: CS4218 Software Testing - Milestone 3
 * Test Type: Spike Testing (Non-Functional Testing)
 * 
 * Purpose:
 * This spike test simulates a sudden surge of users performing search operations
 * to measure the system's ability to handle rapid traffic increases and identify
 * performance bottlenecks in the search functionality.
 * 
 * Spike Pattern:
 * - Starts with minimal load (2 VUs)
 * - Rapidly spikes to 100 VUs in 10 seconds
 * - Holds peak load for 30 seconds
 * - Rapidly drops back to 2 VUs
 * - Cool down period
 * 
 * Metrics Measured:
 * - Response time (p90, p95, p99, avg, min, max, med)
 * - Request throughput (requests per second)
 * - Error rate during spike
 * - Data transfer (bytes sent/received)
 * - Connection time, TLS handshake time, waiting time
 * - Recovery time after spike
 * 
 * Usage:
 *   k6 run tests/nft/spike-search-k6.js
 *   k6 run --env BASE_URL=http://localhost:6060 tests/nft/spike-search-k6.js
 */

// Tay Kai Jun, A0283343E
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// Custom metrics for detailed analysis
// Tay Kai Jun, A0283343E
const searchResponseTime = new Trend('search_response_time', true);
const searchSuccessRate = new Rate('search_success_rate');
const searchErrorCount = new Counter('search_errors');
const searchResultCount = new Trend('search_result_count');

// Additional performance metrics
// Tay Kai Jun, A0283343E
const errorRate = new Rate('error_rate');
const requestsPerSecond = new Trend('requests_per_second');
const dataReceived = new Trend('data_received_kb');
const dataSent = new Trend('data_sent_kb');
const waitingTime = new Trend('waiting_time');
const connectingTime = new Trend('connecting_time');
const tlsHandshakeTime = new Trend('tls_handshake_time');
const concurrentUsers = new Gauge('concurrent_users');

// Spike test configuration
// Tay Kai Jun, A0283343E
export const options = {
  scenarios: {
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: [
        // Stage 1: Warm-up with minimal load
        { duration: '10s', target: 2 },
        
        // Stage 2: SPIKE - Rapid increase to peak load of 100 VUs
        { duration: '10s', target: 100 },
        
        // Stage 3: Hold at peak load to observe system behavior
        { duration: '30s', target: 100 },
        
        // Stage 4: Rapid decrease - observe recovery
        { duration: '10s', target: 2 },
        
        // Stage 5: Cool down period
        { duration: '20s', target: 2 },
      ],
      gracefulRampDown: '5s',
    },
  },
  
  // Performance thresholds - test fails if these are breached
  // Tay Kai Jun, A0283343E
  thresholds: {
    // 90th percentile response time (primary metric)
    'http_req_duration': ['p(90)<2000', 'p(95)<3000', 'p(99)<5000'],
    
    // Search-specific response time with p90
    'search_response_time': ['p(90)<2000', 'p(95)<3000', 'avg<1500'],
    
    // At least 95% success rate
    'search_success_rate': ['rate>0.95'],
    
    // Error rate should be below 5%
    'http_req_failed': ['rate<0.05'],
    'error_rate': ['rate<0.05'],
    
    // Waiting time (time-to-first-byte) should be reasonable
    'waiting_time': ['p(90)<1500'],
    
    // Connection time threshold
    'connecting_time': ['p(95)<500'],
  },
};

// Base URL configuration
// Tay Kai Jun, A0283343E
const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

// Search keywords for realistic testing scenarios
// Tay Kai Jun, A0283343E
const SEARCH_KEYWORDS = [
  'shirt',
  'phone',
  'laptop',
  'book',
  'electronics',
  'NUS',
  'product',
  'test',
  'alpha',
  'beta',
  'gamma',
  'playwright',
  'a',      // Single character - stress test
  'the',    // Common word
  'premium',
  'sale',
];

// Get random search keyword
// Tay Kai Jun, A0283343E
function getRandomKeyword() {
  return SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
}

// Main test function
// Tay Kai Jun, A0283343E
export default function () {
  // Track concurrent users
  concurrentUsers.add(__VU);
  
  group('Search API Spike Test', function () {
    const keyword = getRandomKeyword();
    const url = `${BASE_URL}/api/v1/product/search/${encodeURIComponent(keyword)}`;
    
    // Record start time for custom metric
    const startTime = Date.now();
    
    // Perform search request
    // Tay Kai Jun, A0283343E
    const response = http.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      tags: { name: 'SearchAPI' },
    });
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    searchResponseTime.add(responseTime);
    
    // Track detailed timing metrics
    // Tay Kai Jun, A0283343E
    waitingTime.add(response.timings.waiting);
    connectingTime.add(response.timings.connecting);
    tlsHandshakeTime.add(response.timings.tls_handshaking);
    
    // Track data transfer metrics
    // Tay Kai Jun, A0283343E
    if (response.body) {
      dataReceived.add(response.body.length / 1024); // Convert to KB
    }
    dataSent.add(url.length / 1024); // Approximate request size
    
    // Validate response
    // Tay Kai Jun, A0283343E
    const isSuccess = check(response, {
      'status is 200': (r) => r.status === 200,
      'response is JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
      'response time < 3s': (r) => r.timings.duration < 3000,
      'response has body': (r) => r.body && r.body.length > 0,
    });
    
    // Track success/failure and error rate
    // Tay Kai Jun, A0283343E
    searchSuccessRate.add(isSuccess);
    errorRate.add(!isSuccess);
    
    if (!isSuccess) {
      searchErrorCount.add(1);
      console.log(`[ERROR] Search failed for keyword "${keyword}": Status ${response.status}, Duration ${response.timings.duration}ms`);
    }
    
    // Parse and track result count if successful
    // Tay Kai Jun, A0283343E
    if (response.status === 200) {
      try {
        const results = JSON.parse(response.body);
        if (Array.isArray(results)) {
          searchResultCount.add(results.length);
        }
      } catch (e) {
        // JSON parse error already logged
      }
    }
    
    // Brief pause between requests to simulate realistic user behavior
    sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 seconds
  });
}

// Setup function - runs once before all VUs start
// Tay Kai Jun, A0283343E
export function setup() {
  console.log('='.repeat(70));
  console.log('SPIKE TEST: Search API Performance');
  console.log('Author: Tay Kai Jun, A0283343E');
  console.log('Module: CS4218 - Software Testing MS3');
  console.log('='.repeat(70));
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test Keywords: ${SEARCH_KEYWORDS.length} different search terms`);
  console.log('Spike Pattern: 2 VUs -> 100 VUs (peak) -> 2 VUs');
  console.log('Peak Load: 100 concurrent virtual users');
  console.log('='.repeat(70));
  console.log('Key Metrics Tracked:');
  console.log('  - Response Time: p90, p95, p99, avg, min, max, med');
  console.log('  - Error Rate: % of failed requests');
  console.log('  - Throughput: Requests per second');
  console.log('  - Data Transfer: Bytes sent/received');
  console.log('  - Timing: Connection, TLS, Waiting (TTFB)');
  console.log('='.repeat(70));
  
  // Verify server is reachable
  const healthCheck = http.get(`${BASE_URL}/api/v1/product/search/test`);
  if (healthCheck.status !== 200) {
    console.warn(`Warning: Server health check returned status ${healthCheck.status}`);
  } else {
    console.log('Server health check: OK');
  }
  
  return { startTime: Date.now() };
}

// Teardown function - runs once after all VUs complete
// Tay Kai Jun, A0283343E
export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000).toFixed(2);
  console.log('='.repeat(60));
  console.log('SPIKE TEST COMPLETE');
  console.log(`Total Duration: ${duration} seconds`);
  console.log('='.repeat(60));
  console.log('Review the metrics above for:');
  console.log('  - Response time degradation during spike');
  console.log('  - Error rate increase during peak load');
  console.log('  - Recovery behavior after spike');
  console.log('='.repeat(60));
}

// Handle summary output
// Tay Kai Jun, A0283343E
export function handleSummary(data) {
  const summary = {
    testInfo: {
      author: 'Tay Kai Jun, A0283343E',
      module: 'CS4218 Software Testing - Milestone 3',
      testType: 'Spike Test',
      component: 'Search API',
      peakLoad: '100 VUs',
      timestamp: new Date().toISOString(),
    },
    metrics: {
      // Request counts
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
      
      // Response time metrics with p90
      minResponseTime: data.metrics.http_req_duration?.values?.min?.toFixed(2) || 'N/A',
      avgResponseTime: data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 'N/A',
      medResponseTime: data.metrics.http_req_duration?.values?.med?.toFixed(2) || 'N/A',
      p90ResponseTime: data.metrics.http_req_duration?.values?.['p(90)']?.toFixed(2) || 'N/A',
      p95ResponseTime: data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A',
      p99ResponseTime: data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A',
      maxResponseTime: data.metrics.http_req_duration?.values?.max?.toFixed(2) || 'N/A',
      
      // Error metrics
      errorRate: ((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2) + '%',
      totalErrors: data.metrics.search_errors?.values?.count || 0,
      searchSuccessRate: ((data.metrics.search_success_rate?.values?.rate || 0) * 100).toFixed(2) + '%',
      
      // Throughput
      requestsPerSecond: (data.metrics.http_reqs?.values?.rate || 0).toFixed(2),
      
      // Data transfer
      dataReceived: ((data.metrics.data_received?.values?.count || 0) / 1024).toFixed(2) + ' KB',
      dataSent: ((data.metrics.data_sent?.values?.count || 0) / 1024).toFixed(2) + ' KB',
      
      // Timing breakdown
      avgWaitingTime: data.metrics.waiting_time?.values?.avg?.toFixed(2) || 'N/A',
      avgConnectingTime: data.metrics.connecting_time?.values?.avg?.toFixed(2) || 'N/A',
    },
    thresholds: data.thresholds || {},
  };
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/nft/spike-search-results.json': JSON.stringify(summary, null, 2),
  };
}

// Comprehensive text summary helper
// Tay Kai Jun, A0283343E
function textSummary(data, options) {
  const metrics = data.metrics;
  let output = '\n';
  output += '='.repeat(70) + '\n';
  output += 'SPIKE TEST SUMMARY - Search API (Peak: 100 VUs)\n';
  output += 'Author: Tay Kai Jun, A0283343E\n';
  output += '='.repeat(70) + '\n\n';
  
  // Response Time Metrics (with p90)
  output += '📊 RESPONSE TIME METRICS:\n';
  output += '-'.repeat(50) + '\n';
  output += `  Min Duration:      ${metrics.http_req_duration?.values?.min?.toFixed(2) || 'N/A'} ms\n`;
  output += `  Avg Duration:      ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 'N/A'} ms\n`;
  output += `  Median Duration:   ${metrics.http_req_duration?.values?.med?.toFixed(2) || 'N/A'} ms\n`;
  output += `  P90 Duration:      ${metrics.http_req_duration?.values?.['p(90)']?.toFixed(2) || 'N/A'} ms  ⬅️ Key Metric\n`;
  output += `  P95 Duration:      ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'} ms\n`;
  output += `  P99 Duration:      ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A'} ms\n`;
  output += `  Max Duration:      ${metrics.http_req_duration?.values?.max?.toFixed(2) || 'N/A'} ms\n\n`;
  
  // Error Rate Metrics
  output += '❌ ERROR RATE METRICS:\n';
  output += '-'.repeat(50) + '\n';
  const errorRateValue = ((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2);
  const successRateValue = ((metrics.search_success_rate?.values?.rate || 0) * 100).toFixed(2);
  output += `  HTTP Error Rate:   ${errorRateValue}%  ${parseFloat(errorRateValue) < 5 ? '✅' : '⚠️'}\n`;
  output += `  Success Rate:      ${successRateValue}%  ${parseFloat(successRateValue) > 95 ? '✅' : '⚠️'}\n`;
  output += `  Total Errors:      ${metrics.search_errors?.values?.count || 0}\n`;
  output += `  Failed Requests:   ${metrics.http_req_failed?.values?.passes || 0}\n\n`;
  
  // Throughput Metrics
  output += '⚡ THROUGHPUT METRICS:\n';
  output += '-'.repeat(50) + '\n';
  output += `  Total Requests:    ${metrics.http_reqs?.values?.count || 0}\n`;
  output += `  Requests/sec:      ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}\n\n`;
  
  // Data Transfer
  output += '📦 DATA TRANSFER:\n';
  output += '-'.repeat(50) + '\n';
  output += `  Data Received:     ${((metrics.data_received?.values?.count || 0) / 1024).toFixed(2)} KB\n`;
  output += `  Data Sent:         ${((metrics.data_sent?.values?.count || 0) / 1024).toFixed(2)} KB\n\n`;
  
  // Timing Breakdown
  output += '⏱️ TIMING BREAKDOWN:\n';
  output += '-'.repeat(50) + '\n';
  output += `  Avg Waiting (TTFB):    ${metrics.waiting_time?.values?.avg?.toFixed(2) || 'N/A'} ms\n`;
  output += `  P90 Waiting (TTFB):    ${metrics.waiting_time?.values?.['p(90)']?.toFixed(2) || 'N/A'} ms\n`;
  output += `  Avg Connecting:        ${metrics.connecting_time?.values?.avg?.toFixed(2) || 'N/A'} ms\n`;
  output += `  Avg TLS Handshake:     ${metrics.tls_handshake_time?.values?.avg?.toFixed(2) || 'N/A'} ms\n\n`;
  
  // Threshold Results
  output += '🎯 THRESHOLD RESULTS:\n';
  output += '-'.repeat(50) + '\n';
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const status = threshold.ok ? '✓ PASS' : '✗ FAIL';
    const icon = threshold.ok ? '✅' : '❌';
    output += `  ${icon} ${status}: ${name}\n`;
  }
  
  output += '\n' + '='.repeat(70) + '\n';
  output += 'Test completed. Review metrics above for performance analysis.\n';
  output += '='.repeat(70) + '\n';
  
  return output;
}
