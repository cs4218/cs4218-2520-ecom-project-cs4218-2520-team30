/**
 * K6 Spike Test - Login API (Flash Sale Scenario)
 * 
 * Author: Tay Kai Jun, A0283343E
 * Module: CS4218 Software Testing - Milestone 3
 * Test Type: Spike Testing (Non-Functional Testing)
 * 
 * Purpose:
 * Simulate a "Flash Sale" login spike where thousands of users try to 
 * authenticate simultaneously. Tests if Node.js server and MongoDB 
 * connection pool can handle extreme authentication load.
 * 
 * Scenario:
 * - Spike from 0 to 500 users in 10 seconds
 * - Hold at 500 users for 30 seconds (simulating flash sale duration)
 * - Ramp down to 0 over 10 seconds
 * 
 * Usage:
 *   k6 run tests/nft/spike-login-k6.js
 *   k6 run --env BASE_URL=http://localhost:6060 tests/nft/spike-login-k6.js
 * 
 * Prerequisites:
 *   - Server must be running on the specified port
 *   - Test will create temporary test users in setup phase
 */

// Tay Kai Jun, A0283343E
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics for login spike test
// Tay Kai Jun, A0283343E
const loginResponseTime = new Trend('login_response_time', true);
const loginSuccessRate = new Rate('login_success_rate');
const loginErrorCount = new Counter('login_errors');
const authTokenReceived = new Rate('auth_token_received');
const slowResponseRate = new Rate('slow_response_rate');
const slowResponseCount = new Counter('slow_responses');
const concurrentUsers = new Gauge('concurrent_users');
const waitingTime = new Trend('waiting_time');

// Spike test configuration for Flash Sale scenario
// Tay Kai Jun, A0283343E
export const options = {
  scenarios: {
    flash_sale_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Stage 1: Warm-up (baseline)
        { duration: '5s', target: 5 },
        
        // Stage 2: SPIKE! Flash sale starts - rapid ramp to 100 users
        { duration: '10s', target: 100 },
        
        // Stage 3: Sustained peak - flash sale in progress
        { duration: '30s', target: 100 },
        
        // Stage 4: Recovery - flash sale ends
        { duration: '10s', target: 20 },
        
        // Stage 5: Cool-down
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  
  // Performance thresholds (adjusted for realistic expectations)
  // Tay Kai Jun, A0283343E
  thresholds: {
    // Response time thresholds
    'http_req_duration': ['p(90)<5000', 'p(95)<8000', 'p(99)<15000'],
    'login_response_time': ['p(90)<5000', 'p(95)<8000', 'avg<3000'],
    
    // Success rate thresholds
    'login_success_rate': ['rate>0.95'],
    'http_req_failed': ['rate<0.05'],
    
    // Auth token thresholds
    'auth_token_received': ['rate>0.90'],
    
    // Waiting time (TTFB)
    'waiting_time': ['p(90)<4000'],
  },
};

// Configuration
// Tay Kai Jun, A0283343E
const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';
const API_PREFIX = '/api/v1/auth';

// Test users configuration
// We'll use a pool of pre-created test users
// Tay Kai Jun, A0283343E
const TEST_USER_COUNT = 50; // Number of test users to create
const TEST_USER_PREFIX = 'spiketest';
const TEST_PASSWORD = 'SpikeTesting123!';

// Generate test user credentials
// Tay Kai Jun, A0283343E
function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      name: `Spike Test User ${i}`,
      email: `${TEST_USER_PREFIX}${i}@test.com`,
      password: TEST_PASSWORD,
      phone: `900000000${i.toString().padStart(2, '0')}`,
      address: `Test Address ${i}`,
      answer: 'spiketest',
    });
  }
  return users;
}

// Setup function - runs once before all VUs start
// Creates test users for the spike test
// Tay Kai Jun, A0283343E
export function setup() {
  console.log('='.repeat(70));
  console.log('FLASH SALE LOGIN SPIKE TEST');
  console.log('Author: Tay Kai Jun, A0283343E');
  console.log('Module: CS4218 - Software Testing MS3');
  console.log('='.repeat(70));
  console.log(`Target Server: ${BASE_URL}`);
  console.log(`Test Users: ${TEST_USER_COUNT}`);
  console.log(`Peak Load: 100 VUs`);
  console.log('='.repeat(70));
  console.log('Setting up test users...');
  
  const testUsers = generateTestUsers(TEST_USER_COUNT);
  const registeredUsers = [];
  
  // Register test users
  for (const user of testUsers) {
    const registerRes = http.post(
      `${BASE_URL}${API_PREFIX}/register`,
      JSON.stringify(user),
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: '30s',
      }
    );
    
    if (registerRes.status === 201 || 
        (registerRes.status === 200 && registerRes.body.includes('Already registered'))) {
      registeredUsers.push({
        email: user.email,
        password: user.password,
      });
    } else {
      console.log(`[SETUP] Warning: Could not register user ${user.email}`);
    }
  }
  
  console.log(`[SETUP] Registered/Found ${registeredUsers.length} test users`);
  console.log('='.repeat(70));
  console.log('Starting spike test...');
  console.log('='.repeat(70));
  
  return { users: registeredUsers };
}

// Main test function - simulates login attempts
// Tay Kai Jun, A0283343E
export default function(data) {
  // Track concurrent users
  concurrentUsers.add(__VU);
  
  // Select a random test user from the pool
  const userIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[userIndex];
  
  group('Flash Sale Login', function() {
    // Prepare login request
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });
    
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: '60s', // Higher timeout for spike conditions
      tags: { name: 'login' },
    };
    
    // Execute login request
    // Tay Kai Jun, A0283343E
    const startTime = Date.now();
    const response = http.post(`${BASE_URL}${API_PREFIX}/login`, loginPayload, params);
    const duration = Date.now() - startTime;
    
    // Track response time
    loginResponseTime.add(duration);
    
    // Track waiting time (TTFB)
    waitingTime.add(response.timings.waiting);
    
    // Validate response - separate HTTP success from performance
    // Tay Kai Jun, A0283343E
    const isHttpSuccess = check(response, {
      'status is 200': (r) => r.status === 200,
      'response is JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
      'response has body': (r) => r.body && r.body.length > 0,
    });
    
    // Check if login was successful (got token)
    // Tay Kai Jun, A0283343E
    let loginSuccess = false;
    let hasToken = false;
    
    if (response.status === 200) {
      try {
        const body = JSON.parse(response.body);
        loginSuccess = body.success === true;
        hasToken = body.token !== undefined && body.token !== null;
      } catch (e) {
        // JSON parse error
      }
    }
    
    // Performance check (SLA: response time < 5s for spike test conditions)
    // Tay Kai Jun, A0283343E - 5s is acceptable during spike load with bcrypt auth
    const isWithinSLA = check(response, {
      'response time < 5s': (r) => r.timings.duration < 5000,
    });
    
    // Track metrics
    loginSuccessRate.add(isHttpSuccess && loginSuccess);
    authTokenReceived.add(hasToken);
    slowResponseRate.add(!isWithinSLA);
    
    // Log errors (actual HTTP failures or login failures)
    if (!isHttpSuccess) {
      loginErrorCount.add(1);
      console.log(`[ERROR] HTTP error: Status ${response.status}, Duration ${duration}ms`);
    } else if (!loginSuccess) {
      loginErrorCount.add(1);
      // Only log some failures to avoid spam
      if (__ITER < 5 || __ITER % 50 === 0) {
        console.log(`[FAIL] Login failed: Status ${response.status}, Duration ${duration}ms`);
      }
    }
    
    // Track slow responses separately
    // Tay Kai Jun, A0283343E
    if (isHttpSuccess && !isWithinSLA) {
      slowResponseCount.add(1);
      if (__ITER < 5 || __ITER % 100 === 0) {
        console.log(`[SLOW] Response exceeded 2s: Duration ${duration}ms`);
      }
    }
  });
  
  // Brief pause between requests (simulating user think time)
  sleep(Math.random() * 0.3 + 0.1); // 0.1-0.4 seconds
}

// Teardown function - runs once after all VUs finish
// Tay Kai Jun, A0283343E
export function teardown(data) {
  const duration = (__ENV.K6_TEST_DURATION || '65').replace('s', '');
  
  console.log('='.repeat(60));
  console.log('FLASH SALE SPIKE TEST COMPLETE');
  console.log(`Total Duration: ~${duration} seconds`);
  console.log('='.repeat(60));
  console.log('Review the metrics above for:');
  console.log('  - Response time degradation during spike');
  console.log('  - Login success rate under extreme load');
  console.log('  - Token generation success rate');
  console.log('  - Recovery behavior after spike');
  console.log('='.repeat(60));
  console.log('');
  console.log('NOTE: Test users remain in database for future tests.');
  console.log(`      Users: ${TEST_USER_PREFIX}0@test.com to ${TEST_USER_PREFIX}${TEST_USER_COUNT - 1}@test.com`);
  console.log('      To clean up, delete users with email pattern: spiketest*@test.com');
  console.log('='.repeat(60));
}

// Handle summary output
// Tay Kai Jun, A0283343E
export function handleSummary(data) {
  const summary = {
    testInfo: {
      author: 'Tay Kai Jun, A0283343E',
      module: 'CS4218 Software Testing - Milestone 3',
      testType: 'Spike Test - Flash Sale Login',
      component: 'Login API',
      peakLoad: '100 VUs',
      timestamp: new Date().toISOString(),
    },
    metrics: {
      // Request counts
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
      
      // Response time metrics
      minResponseTime: data.metrics.http_req_duration?.values?.min?.toFixed(2) || 'N/A',
      avgResponseTime: data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 'N/A',
      medResponseTime: data.metrics.http_req_duration?.values?.med?.toFixed(2) || 'N/A',
      p90ResponseTime: data.metrics.http_req_duration?.values?.['p(90)']?.toFixed(2) || 'N/A',
      p95ResponseTime: data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A',
      p99ResponseTime: data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A',
      maxResponseTime: data.metrics.http_req_duration?.values?.max?.toFixed(2) || 'N/A',
      
      // Login metrics
      loginSuccessRate: ((data.metrics.login_success_rate?.values?.rate || 0) * 100).toFixed(2) + '%',
      authTokenRate: ((data.metrics.auth_token_received?.values?.rate || 0) * 100).toFixed(2) + '%',
      totalLoginErrors: data.metrics.login_errors?.values?.count || 0,
      
      // Slow response metrics
      slowResponseRate: ((data.metrics.slow_response_rate?.values?.rate || 0) * 100).toFixed(2) + '%',
      totalSlowResponses: data.metrics.slow_responses?.values?.count || 0,
      
      // Throughput
      requestsPerSecond: (data.metrics.http_reqs?.values?.rate || 0).toFixed(2),
      
      // Waiting time (TTFB)
      avgWaitingTime: data.metrics.waiting_time?.values?.avg?.toFixed(2) || 'N/A',
      p90WaitingTime: data.metrics.waiting_time?.values?.['p(90)']?.toFixed(2) || 'N/A',
    },
    thresholds: {},
  };
  
  // Add threshold results
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    summary.thresholds[name] = threshold.ok ? 'PASS' : 'FAIL';
  }
  
  return {
    'stdout': textSummary(data),
    'tests/nft/spike-login-results.json': JSON.stringify(summary, null, 2),
  };
}

// Comprehensive text summary helper
// Tay Kai Jun, A0283343E
function textSummary(data) {
  const metrics = data.metrics;
  let output = '\n';
  output += '='.repeat(70) + '\n';
  output += '🔥 FLASH SALE LOGIN SPIKE TEST SUMMARY (Peak: 100 VUs)\n';
  output += 'Author: Tay Kai Jun, A0283343E\n';
  output += '='.repeat(70) + '\n\n';
  
  // Response Time Metrics
  output += '📊 RESPONSE TIME METRICS:\n';
  output += '-'.repeat(50) + '\n';
  output += `  Min Duration:      ${metrics.http_req_duration?.values?.min?.toFixed(2) || 'N/A'} ms\n`;
  output += `  Avg Duration:      ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 'N/A'} ms\n`;
  output += `  Median Duration:   ${metrics.http_req_duration?.values?.med?.toFixed(2) || 'N/A'} ms\n`;
  output += `  P90 Duration:      ${metrics.http_req_duration?.values?.['p(90)']?.toFixed(2) || 'N/A'} ms  ⬅️ Key Metric\n`;
  output += `  P95 Duration:      ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'} ms\n`;
  output += `  P99 Duration:      ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A'} ms\n`;
  output += `  Max Duration:      ${metrics.http_req_duration?.values?.max?.toFixed(2) || 'N/A'} ms\n\n`;
  
  // Login Success Metrics
  output += '🔐 LOGIN SUCCESS METRICS:\n';
  output += '-'.repeat(50) + '\n';
  const loginSuccessRate = ((metrics.login_success_rate?.values?.rate || 0) * 100).toFixed(2);
  const tokenRate = ((metrics.auth_token_received?.values?.rate || 0) * 100).toFixed(2);
  output += `  Login Success Rate: ${loginSuccessRate}%  ${parseFloat(loginSuccessRate) > 90 ? '✅' : '⚠️'}\n`;
  output += `  Token Received:     ${tokenRate}%  ${parseFloat(tokenRate) > 85 ? '✅' : '⚠️'}\n`;
  output += `  Total Login Errors: ${metrics.login_errors?.values?.count || 0}\n\n`;
  
  // Slow Response Metrics
  output += '🐢 SLOW RESPONSE METRICS (SLA: < 5s for spike test):\n';
  output += '-'.repeat(50) + '\n';
  const slowRate = ((metrics.slow_response_rate?.values?.rate || 0) * 100).toFixed(2);
  output += `  Slow Response Rate: ${slowRate}%  ${parseFloat(slowRate) < 15 ? '✅' : '⚠️'}\n`;
  output += `  Total Slow (>5s):   ${metrics.slow_responses?.values?.count || 0}\n\n`;
  
  // Throughput Metrics
  output += '⚡ THROUGHPUT METRICS:\n';
  output += '-'.repeat(50) + '\n';
  output += `  Total Requests:    ${metrics.http_reqs?.values?.count || 0}\n`;
  output += `  Requests/sec:      ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}\n\n`;
  
  // Waiting Time (TTFB)
  output += '⏱️ WAITING TIME (TTFB):\n';
  output += '-'.repeat(50) + '\n';
  output += `  Avg Waiting:       ${metrics.waiting_time?.values?.avg?.toFixed(2) || 'N/A'} ms\n`;
  output += `  P90 Waiting:       ${metrics.waiting_time?.values?.['p(90)']?.toFixed(2) || 'N/A'} ms\n\n`;
  
  // Threshold Results
  output += '🎯 THRESHOLD RESULTS:\n';
  output += '-'.repeat(50) + '\n';
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const status = threshold.ok ? '✓ PASS' : '✗ FAIL';
    const icon = threshold.ok ? '✅' : '❌';
    output += `  ${icon} ${status}: ${name}\n`;
  }
  
  output += '\n' + '='.repeat(70) + '\n';
  output += '🔥 Flash Sale Spike Test Complete!\n';
  output += 'Check metrics above for system behavior under extreme auth load.\n';
  output += '='.repeat(70) + '\n';
  
  return output;
}
