#!/usr/bin/env node
/**
 * One-command local deployment for FolLand / AgriVision.
 *
 *   npm run serve                 install (if needed) → build (if sources changed) → start
 *   npm run serve -- --port 4000  preferred port (falls back to the next free one)
 *   npm run serve -- --rebuild    force a fresh production build
 *   npm run serve -- --dev        fast development server (Turbopack) instead of production
 *
 * Works the same on Windows, macOS and Linux. Uses only Node built-ins.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const log = (msg) => console.log(`\x1b[32m[folland]\x1b[0m ${msg}`);
const fail = (msg) => {
  console.error(`\x1b[31m[folland]\x1b[0m ${msg}`);
  process.exit(1);
};

/* ---------- 1. Node version ---------- */
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 18 || (major === 18 && minor < 18)) fail(`Node.js ${process.versions.node} is too old. Install Node 20 or 22 LTS from https://nodejs.org`);

// Node 25+ enables a server-side localStorage that warns ("--localstorage-file was not provided")
// and can confuse libraries. Disable it for the Next.js process when this Node supports the flag.
const nodeFlags = [];
if (major >= 25 && spawnSync(process.execPath, ["--no-experimental-webstorage", "-e", "0"]).status === 0) {
  nodeFlags.push("--no-experimental-webstorage");
}

const run = (cmd, cmdArgs) => {
  const r = spawnSync(cmd, cmdArgs, { cwd: root, stdio: "inherit", shell: isWin });
  return r.status === 0;
};
const mtime = (p) => {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
};
const newest = (dir) => {
  let max = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else max = Math.max(max, mtime(p));
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return max;
};

/* ---------- 2. Dependencies ---------- */
const lock = path.join(root, "package-lock.json");
const installedLock = path.join(root, "node_modules", ".package-lock.json");
if (!fs.existsSync(installedLock) || mtime(lock) > mtime(installedLock)) {
  log("Installing dependencies (first run or package-lock.json changed)…");
  const npm = isWin ? "npm.cmd" : "npm";
  if (!run(npm, ["ci", "--no-audit", "--no-fund"]) && !run(npm, ["install", "--no-audit", "--no-fund"])) {
    fail("npm install failed. Check your internet connection and try again.");
  }
}

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
if (!fs.existsSync(nextBin)) fail("Next.js is missing from node_modules. Delete node_modules and run again.");
const next = (nextArgs, opts = {}) => spawn(process.execPath, [...nodeFlags, nextBin, ...nextArgs], { cwd: root, stdio: "inherit", ...opts });

/* ---------- 3. Port ---------- */
const portFree = (port) =>
  new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port);
  });
async function pickPort(start) {
  for (let p = start; p < start + 20; p++) if (await portFree(p)) return p;
  fail(`No free port between ${start} and ${start + 19}.`);
}

function printUrls(port) {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
  log(`Open  http://localhost:${port}`);
  for (const ip of lan) log(`Phone http://${ip}:${port}  (same Wi-Fi)`);
}

/* ---------- 4. Build + start ---------- */
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
const port = await pickPort(Number(option("port", process.env.PORT || 3000)));
if (port !== Number(option("port", process.env.PORT || 3000))) log(`Port in use, using ${port} instead.`);

if (flag("dev")) {
  log("Starting development server (Turbopack)…");
  printUrls(port);
  const child = next(["dev", "--turbopack", "-p", String(port), "-H", "0.0.0.0"], { env });
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  const buildId = path.join(root, ".next", "BUILD_ID");
  const sourceTime = Math.max(
    newest(path.join(root, "src")),
    newest(path.join(root, "public")),
    ...["package-lock.json", "next.config.mjs", "tailwind.config.ts", "postcss.config.mjs", "tsconfig.json"].map((f) => mtime(path.join(root, f))),
  );
  // Proxy rules (FOLLAND_API_URL) are baked in at build time, so a changed value needs a rebuild.
  const envStamp = path.join(root, ".next", "folland-build-env.json");
  const buildEnv = JSON.stringify({ FOLLAND_API_URL: process.env.FOLLAND_API_URL || "" });
  const envChanged = (() => {
    try {
      return fs.readFileSync(envStamp, "utf8") !== buildEnv;
    } catch {
      return true;
    }
  })();
  if (flag("rebuild") || !fs.existsSync(buildId) || sourceTime > mtime(buildId) || envChanged) {
    log("Building optimized production bundle (only when sources changed)…");
    const ok = await new Promise((res) => next(["build"], { env: { ...env, NODE_ENV: "production" } }).on("exit", (c) => res(c === 0)));
    if (!ok) fail("Build failed — see the errors above.");
    fs.writeFileSync(envStamp, buildEnv);
  } else {
    log("Build is up to date, skipping rebuild.");
  }
  log("Starting production server…");
  const child = next(["start", "-p", String(port), "-H", "0.0.0.0"], { env: { ...env, NODE_ENV: "production" } });
  setTimeout(() => printUrls(port), 1500);
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
  child.on("exit", (code) => process.exit(code ?? 0));
}
