// Leong Soon Mun Stephane, A0273409B
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const productListDuration = new Trend("product_list_duration");
const productFilterDuration = new Trend("product_filter_duration");
const productSearchDuration = new Trend("product_search_duration");
const errorRate = new Rate("error_rate");

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

const SEARCH_KEYWORDS = ["phone", "laptop", "shirt", "shoe", "watch", "camera", "headphones", "tablet"];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}


export const options = {
    stages: [
        { duration: "30s", target: 100 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 300 },
        { duration: "30s", target: 400 }, 
        { duration: "30s", target: 500 },  
        { duration: "30s", target: 100 }, 
    ],
    thresholds: {
        http_req_duration: ["p(90)<2000"], 
        http_req_failed: ["rate<0.02"],  
        error_rate: ["rate<0.02"],

        product_list_duration: ["p(90)<2000"], 
        product_filter_duration: ["p(90)<2000"],
        product_search_duration: ["p(90)<2000"],
    },
};


function testProductList() {
    group("1. Product List", () => {
        const res = http.get(`${BASE_URL}/api/v1/product/product-list/1`);
        productListDuration.add(res.timings.duration);

        const success = check(res, {
            "product list: status 200": (r) => r.status === 200,
            "product list: returns array": (r) => Array.isArray(r.json().products),
        });

        if (!success) errorRate.add(1);
        else errorRate.add(0);
    });
}

function testProductFilter() {
    group("2. Product Filter", () => {
        const minPrice = Math.floor(Math.random() * 50);
        const maxPrice = minPrice + Math.floor(Math.random() * 200) + 50;
        const payload = JSON.stringify({
            checked: [],
            radio: [minPrice, maxPrice],
        });

        const filterRes = http.post(
            `${BASE_URL}/api/v1/product/product-filters`,
            payload,
            { headers: { "Content-Type": "application/json" } }
        );
        productFilterDuration.add(filterRes.timings.duration);

        const success = check(filterRes, {
            "filter: status 200": (r) => r.status === 200,
            "product list: returns array": (r) => Array.isArray(r.json().products),
        });

        if (!success) errorRate.add(1);
        else errorRate.add(0);
    });
}

function testProductSearch() {
    group("3. Product Search", () => {
        const keyword = randomItem(SEARCH_KEYWORDS);

        const searchRes = http.get(
            `${BASE_URL}/api/v1/product/search/${keyword}`
        );
        productSearchDuration.add(searchRes.timings.duration);

        const success = check(searchRes, {
            "search: status 200": (r) => r.status === 200,
            "search: returns array": (r) => Array.isArray(r.json()),
        });

        if (!success) errorRate.add(1);
        else errorRate.add(0);
    });
}

export default function () {
    testProductList();
    sleep(1);

    testProductFilter();
    sleep(1);

    testProductSearch();
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