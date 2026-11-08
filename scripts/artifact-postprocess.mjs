// After `NEXT_PUBLIC_ARTIFACT=1 next build`: the preview is a single page (index.html) that
// shows every view via #hashes. Drop the other pages so nothing links to them.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("out");
for (const p of ["how-it-works", "sources", "_not-found", "404"]) fs.rmSync(path.join(root, p), { recursive: true, force: true });
console.log("single-page preview ready in out/");
