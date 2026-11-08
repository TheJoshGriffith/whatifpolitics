// Serve out/ and take Playwright screenshots. Usage: node scripts/screenshot.mjs [outDir]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Playwright isn't a project dependency: use a globally installed copy (NODE_PATH or npm root -g).
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? "playwright");

const root = path.resolve("out");
const shotDir = path.resolve(process.argv[2] ?? "screenshots");
fs.mkdirSync(shotDir, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".txt": "text/plain", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = path.join(root, p);
  if (!f.startsWith(root)) return res.writeHead(403).end();
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) return res.writeHead(404).end("not found");
  res.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const errors = [];
const pages = [["home", "/"], ["how-it-works", "/how-it-works/"], ["sources", "/sources/"]];
for (const width of [1280, 375]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push(`${width} ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${width} console: ${m.text()}`));
  for (const [name, url] of pages) {
    await page.goto(base + url, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) errors.push(`${width} ${name}: horizontal overflow ${overflow}px`);
    await page.screenshot({ path: path.join(shotDir, `${name}-${width}.png`), fullPage: true });
  }
  // exercise interaction: click a preset that hangs parliament
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /No graduates/ }).click();
  await page.screenshot({ path: path.join(shotDir, `home-nograds-${width}.png`), fullPage: true });
  await page.close();
}
await browser.close();
server.close();
console.log(errors.length ? errors.join("\n") : "no errors");
console.log("screenshots in", shotDir);
