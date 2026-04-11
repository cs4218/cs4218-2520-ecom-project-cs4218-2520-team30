// Leong Soon Mun Stephane, A0273409B
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("error_rate");

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

const CREDENTIALS = {
    username: __ENV.TEST_USERNAME || "admin@test.sg",
    password: __ENV.TEST_PASSWORD || "admin@test.sg",
};


export const options = {
    stages: [
        { duration: "30s", target: 100 },  
        { duration: "30s", target: 200 },   
        { duration: "30s", target: 300 },  
        { duration: "1m", target: 400 },  
        { duration: "30s", target: 100 },  
    ],
    thresholds: {
        http_req_duration: ["p(90)<2000"], 
        http_req_failed: ["rate<0.02"], 
        error_rate: ["rate<0.02"],
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function jsonHeaders(token = null) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return { headers };
}

// ─── Test Scenarios ───────────────────────────────────────────────────────────

/** 1. Login — returns auth token or null on failure */
function testLogin() {
    let token = null;

    group("1. Login", () => {
        const payload = JSON.stringify({
            email: CREDENTIALS.username,
            password: CREDENTIALS.password,
        });

        const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, jsonHeaders());

        const success = check(res, {
            "login: status 200": (r) => r.status === 200,
            "login: has token": (r) => r.json("token") !== undefined,
        });

        if (!success) errorRate.add(1);
        else {
            errorRate.add(0);
            token = res.json("token");
        }
    });

    return token;
}

export default function () {
    const token = testLogin();
    if (!token) {
        sleep(1);
        return;
    }
    sleep(1);

    sleep(Math.random() * 2 + 1);
}

export function setup() {
    console.log(`Starting stress test against: ${BASE_URL}`);
    return { startTime: new Date().toISOString() };
}

export function teardown(data) {
    console.log(`Stress test finished. Started at: ${data.startTime}`);
}