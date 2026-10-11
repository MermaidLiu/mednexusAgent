/**
 * workerd ships platform-specific optional packages. If node_modules was copied
 * from another OS, only the wrong @cloudflare/workerd-* folder may be present.
 */
import { spawnSync } from "node:child_process";
import os from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = new URL("..", import.meta.url).pathname;

const platformPackages = {
  "darwin arm64": "@cloudflare/workerd-darwin-arm64",
  "darwin x64": "@cloudflare/workerd-darwin-64",
  "linux arm64": "@cloudflare/workerd-linux-arm64",
  "linux x64": "@cloudflare/workerd-linux-64",
  "win32 x64": "@cloudflare/workerd-windows-64",
};

function workerdVersion() {
  const r = spawnSync(process.execPath, [`${root}/node_modules/workerd/bin/workerd`, "--version"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

function workerdPackageVersion() {
  try {
    return require(`${root}/node_modules/workerd/package.json`).version;
  } catch {
    return "1.20260515.1";
  }
}

const key = `${process.platform} ${os.arch()}`;
const pkg = platformPackages[key];
if (!pkg) {
  console.warn(`[ensure-workerd] Unsupported platform ${key}, skipping.`);
  process.exit(0);
}

if (workerdVersion()) process.exit(0);

console.log(`[ensure-workerd] Installing ${pkg} for ${key}…`);
const ver = workerdPackageVersion();
let install = spawnSync("npm", ["install", `${pkg}@${ver}`, "--no-save"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
if (install.status !== 0) process.exit(install.status ?? 1);

install = spawnSync(process.execPath, [`${root}/node_modules/workerd/install.js`], { cwd: root, stdio: "inherit" });
if (install.status !== 0) process.exit(install.status ?? 1);

if (!workerdVersion()) {
  console.error("[ensure-workerd] workerd still unavailable. Try: rm -rf node_modules && npm ci");
  process.exit(1);
}
