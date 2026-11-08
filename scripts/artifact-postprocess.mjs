// After `NEXT_PUBLIC_ARTIFACT=1 next build`, make every page in out/ use relative URLs
// so the static site works when served from an arbitrary sub-folder.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("out");
const pages = ["", "how-it-works", "sources"];
for (const p of pages) {
  const file = path.join(root, p, "index.html");
  const up = p ? "../" : "./";
  let html = fs.readFileSync(file, "utf8");
  html = html.replaceAll('"./_next/', `"${up}_next/`);
  for (const target of pages) {
    const abs = target ? `/${target}/` : "/";
    html = html.replaceAll(`href="${abs}"`, `href="${up}${target ? target + "/" : ""}index.html"`);
  }
  fs.writeFileSync(file, html);
}
console.log("post-processed", pages.length, "pages");
