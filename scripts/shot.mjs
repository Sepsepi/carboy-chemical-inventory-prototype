#!/usr/bin/env node
// Screenshot a route of the running dev server (http://localhost:3210, or BASE=<url>).
//
//   node scripts/shot.mjs <route> <out.png> [width] [height] [flags]
//
//   --dark            dark theme
//   --full            capture the whole scrollable content, not just the viewport
//   --click=<sel>     click a CSS or text selector first; repeatable, in order
//                     (Playwright selectors: 'text=Add chemical', 'tbody tr >> nth=0')
//   --type=<sel>::<text>   type into a field; repeatable
//   --wait=<ms>       extra wait after the last action (default 500)
//   --scroll=<px>     scroll the content area down this far before the shot
//   --errors          print console errors and failed requests
//
// Examples
//   node scripts/shot.mjs /inventory shots/inv-1440.png 1440 900
//   node scripts/shot.mjs /sds shots/sds-phone.png 390 844 --full
//   node scripts/shot.mjs /inventory shots/inv-detail.png 1440 900 --click='tbody tr >> nth=0'

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright-core";

const [route = "/", out = "shots/shot.png", w = "1440", h = "900", ...rest] = process.argv.slice(2);
const flags = rest.filter((a) => a.startsWith("--"));
const has = (name) => flags.includes(`--${name}`);
const all = (name) => flags.filter((f) => f.startsWith(`--${name}=`)).map((f) => f.slice(name.length + 3));
const steps = flags
  .filter((f) => f.startsWith("--click=") || f.startsWith("--type="))
  .map((f) => (f.startsWith("--click=") ? { click: f.slice(8) } : { type: f.slice(7) }));
const extraWait = Number(all("wait")[0] ?? 500);

mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: Number(w) < 700 ? 2 : 1,
  colorScheme: has("dark") ? "dark" : "light",
});
await context.addInitScript((dark) => {
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {}
}, has("dark"));
const page = await context.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${process.env.BASE ?? "http://localhost:3210"}${route}`, { waitUntil: "networkidle" });
await page.waitForSelector("[data-scroll-root]", { timeout: 15000 });
await page.waitForTimeout(700);

for (const step of steps) {
  if (step.click) {
    await page.locator(step.click).first().click({ timeout: 8000 });
  } else {
    const [sel, text] = step.type.split("::");
    await page.locator(sel).first().fill(text ?? "", { timeout: 8000 });
  }
  await page.waitForTimeout(450);
}
await page.waitForTimeout(extraWait);

// --scroll=<px> scrolls the app's content area (not the window) before the shot
const scrollBy = Number(all("scroll")[0] ?? 0);
if (scrollBy) {
  await page.evaluate((y) => document.querySelector("[data-scroll-root]")?.scrollTo(0, y), scrollBy);
  await page.waitForTimeout(350);
}

if (has("full")) {
  // the app scrolls inside a fixed frame; grow the frame to the content height
  const height = await page.evaluate(() => {
    const root = document.querySelector("[data-scroll-root]");
    const header = document.querySelector("header[data-app-header]");
    return (root?.scrollHeight ?? 0) + (header?.getBoundingClientRect().height ?? 0) + 24;
  });
  await page.setViewportSize({ width: Number(w), height: Math.min(Math.max(height, Number(h)), 6000) });
  await page.waitForTimeout(500);
}

await page.screenshot({ path: out });
if (has("errors") || errors.length) {
  console.log(errors.length ? `console errors (${errors.length}):\n${errors.slice(0, 8).join("\n")}` : "no console errors");
}
console.log(`saved ${out}`);
await browser.close();
