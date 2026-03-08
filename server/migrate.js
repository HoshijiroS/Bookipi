const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

// Always load .env from this directory (server/.env), regardless of CWD
require("dotenv").config({ path: path.join(__dirname, ".env") });

const direction = process.argv[2] === "down" ? "down" : "up";

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is required (see .env.example)");
  process.exit(1);
}

const binName = process.platform === "win32" ? "node-pg-migrate.cmd" : "node-pg-migrate";
const localBin = path.join(__dirname, "node_modules", ".bin", binName);
const workspaceBin = path.join(__dirname, "..", "node_modules", ".bin", binName);
const bin = fs.existsSync(localBin) ? localBin : workspaceBin;

console.log("[migrate] using binary:", bin);
console.log("[migrate] DATABASE_URL:", process.env.DATABASE_URL);

const args = ["-m", "migrations", direction];
console.log("bin: ", bin);

const result = spawnSync(bin, args, { stdio: "inherit" });
process.exit(result.status ?? 1);