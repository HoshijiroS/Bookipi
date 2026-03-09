#!/usr/bin/env node
/**
 * Load test script for Bookipi API.
 * Simulates heavy traffic by hitting /api/products, /api/flash-sale, /api/flash-sale/status
 * and optionally POST /api/checkout with unique user IDs.
 *
 * Usage:
 *   node scripts/load-test.js [concurrency] [duration_sec]
 *   Or set env: BASE_URL, CONCURRENCY, DURATION_SEC, RPS_CAP, CHECKOUT_PCT
 *
 * Examples:
 *   npm run load-test
 *   npm run load-test:heavy     # 50 workers, 60s
 *   node scripts/load-test.js 30 45
 *   CHECKOUT_PCT=10 node scripts/load-test.js
 */

// Optional CLI args: node load-test.js [concurrency] [duration_sec]

// Always load .env from this directory (server/.env), regardless of CWD
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const argv = process.argv.slice(2);
const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const CONCURRENCY = parseInt(argv[0] || process.env.CONCURRENCY || "20", 10);
const DURATION_SEC = parseInt(argv[1] || process.env.DURATION_SEC || "30", 10);
const RPS_CAP = parseInt(process.env.RPS_CAP || "10", 10);
const CHECKOUT_PCT = Math.min(100, Math.max(0, parseInt(process.env.CHECKOUT_PCT || "0", 10)));

const ENDPOINTS = {
  products: { method: "GET", path: "/api/products" },
  flashSale: { method: "GET", path: "/api/flash-sale" },
  flashSaleStatus: { method: "GET", path: "/api/flash-sale/status" },
  checkout: { method: "POST", path: "/api/checkout", body: (id) => ({
    userId: `loadtest-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    items: [{ productId: "1", quantity: 1 }]
  }) }
};

const stats = {
  requests: 0,
  ok: 0,
  errors: 0,
  statusCounts: {},
  latencies: []
};

function pickRequest() {
  if (CHECKOUT_PCT > 0 && Math.random() * 100 < CHECKOUT_PCT) {
    return { ...ENDPOINTS.checkout, body: ENDPOINTS.checkout.body(stats.requests) };
  }
  const keys = ["products", "flashSale", "flashSaleStatus"];
  const key = keys[Math.floor(Math.random() * keys.length)];
  return ENDPOINTS[key];
}

async function runRequest() {
  const req = pickRequest();
  const url = BASE_URL + req.path;
  const start = performance.now();
  let status = 0;

  try {
    const res = await fetch(url, {
      method: req.method,
      headers: req.body ? { "content-type": "application/json" } : undefined,
      body: req.body ? JSON.stringify(req.body) : undefined
    });
    status = res.status;
    await res.text();
    stats.requests++;
    stats.latencies.push(performance.now() - start);
    if (res.ok) stats.ok++;
    else stats.errors++;
    stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;
  } catch (err) {
    stats.requests++;
    stats.errors++;
    stats.latencies.push(performance.now() - start);
    stats.statusCounts["err"] = (stats.statusCounts["err"] || 0) + 1;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function worker(until) {
  const minInterval = RPS_CAP > 0 ? 1000 / RPS_CAP : 0;
  while (Date.now() < until) {
    await runRequest();
    if (minInterval > 0) await sleep(minInterval);
  }
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)];
}

function report() {
  const elapsed = (Date.now() - startTime) / 1000;
  const rps = stats.requests / elapsed;
  console.log("\n--- Load test results ---");
  console.log(`Duration:     ${elapsed.toFixed(1)}s`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Total:        ${stats.requests} requests`);
  console.log(`OK:           ${stats.ok}`);
  console.log(`Errors:       ${stats.errors}`);
  console.log(`RPS:          ${rps.toFixed(1)}`);
  if (stats.latencies.length) {
    console.log(`Latency (ms): p50=${percentile(stats.latencies, 50).toFixed(0)} p95=${percentile(stats.latencies, 95).toFixed(0)} p99=${percentile(stats.latencies, 99).toFixed(0)}`);
  }
  if (Object.keys(stats.statusCounts).length) {
    console.log("Status:      ", stats.statusCounts);
  }
  console.log("----------------------------\n");
}

const startTime = Date.now();
const until = startTime + DURATION_SEC * 1000;

console.log(`Load test: ${BASE_URL} | ${CONCURRENCY} workers | ${DURATION_SEC}s | checkout ${CHECKOUT_PCT}%`);
console.log("Running...");

Promise.all(Array.from({ length: CONCURRENCY }, () => worker(until)))
  .then(report)
  .catch((err) => {
    console.error(err);
    report();
    process.exit(1);
  });
