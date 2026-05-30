#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(new URL("../apps/frontend/package.json", import.meta.url));
const { chromium } = require("playwright");

const baseUrl = (process.env.ARCPAY_DOCS_CAPTURE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const outDir = path.resolve("images");

const shots = [
  { name: "landing", path: "/" },
  { name: "docs", path: "/docs" },
  { name: "x402", path: "/app/x402" },
  { name: "privacy", path: "/privacy" },
  { name: "invoices", path: "/invoices" },
  { name: "audit", path: "/audit" },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: findLocalBrowser(),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });

await page.addInitScript(() => {
  window.localStorage.setItem("arcpay-arbitrum-wallet-session", JSON.stringify({
    address: "0xB883e76A4f6841E72cAF1C28ba00f78df974f448",
    demo: true,
  }));
});

for (const shot of shots) {
  const url = `${baseUrl}${shot.path}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, `${shot.name}.png`), fullPage: true });
  console.log(`captured ${shot.name}: ${url}`);
}

await browser.close();

function findLocalBrowser() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}
