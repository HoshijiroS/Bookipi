#!/usr/bin/env node
/**
 * Stress test: very high concurrency, short burst.
 * Use to find breaking points (e.g. connection limits, rate limits).
 *
 *   node scripts/stress-test.js
 *   CONCURRENCY=200 BURST_REQUESTS=500 node scripts/stress-test.js
 */

// Always load .env from this directory (server/.env), regardless of CWD
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "100", 10);
const BURST_REQUESTS = parseInt(process.env.BURST_REQUESTS || "500", 10);

const paths = ["/api/products", "/api/flash-sale/status", "/api/flash-sale"];
const stats = { ok: 0, err: 0, latencies: [] };

async function oneRequest() {
  const path = paths[Math.floor(Math.random() * paths.length)];
  const start = performance.now();
  try {
    const res = await fetch(BASE_URL + path);
    stats.latencies.push(performance.now() - start);
    if (res.ok) stats.ok++;
    else stats.err++;
    await res.text();
  } catch (_) {
    stats.latencies.push(performance.now() - start);
    stats.err++;
  }
}

async function run() {
  const perWorker = Math.ceil(BURST_REQUESTS / CONCURRENCY);
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (let i = 0; i < perWorker; i++) await oneRequest();
  });
  const start = Date.now();
  await Promise.all(workers);
  const elapsed = (Date.now() - start) / 1000;
  const total = stats.ok + stats.err;
  const sorted = [...stats.latencies].sort((a, b) => a - b);
  const p99 = sorted[Math.ceil(0.99 * sorted.length) - 1];

  console.log("\n--- Stress test ---");
  console.log(`Total: ${total} | OK: ${stats.ok} | Errors: ${stats.err}`);
  console.log(`Time: ${elapsed.toFixed(2)}s | RPS: ${(total / elapsed).toFixed(0)}`);
  console.log(`Latency p99: ${p99 != null ? p99.toFixed(0) : "-"} ms`);
  console.log("------------------\n");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
