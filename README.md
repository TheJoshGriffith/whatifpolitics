# What If Britain…?

A casual, cheeky toy that re-runs the UK 2024 general election under "what if only some of us voted?" scenarios. Next.js (App Router) + TypeScript + Tailwind, exported as a static site.

```bash
npm install
npm run dev        # local dev
npm test           # vitest (engine + data sanity)
npm run lint
npm run build      # static site in out/
BASE_PATH=/what-if npm run build   # if hosting under a sub-path
NODE_PATH=$(npm root -g) npm run screenshot   # serve out/ and screenshot with a global Playwright
```

## Data (src/data/*.json)

Everything is computed client-side from these files. Each has `"placeholder": true` while it holds made-up numbers; the site shows a banner until **all** are `false`. Types live in `src/lib/types.ts` (`*File` interfaces), loaded in `src/lib/data.ts`.

| File | Shape |
| --- | --- |
| `parties.json` | `{ placeholder, parties: Party[] }` — order = left-to-right in the parliament chart |
| `dimensions.json` | `{ placeholder, dimensions: Dimension[] }` |
| `constituencies.json` | `{ placeholder, constituencies: Constituency[] }` |
| `groupVoting.json` | `{ placeholder, groupVoting: { [dimensionId]: { source, groups: { [groupId]: { turnout, shares } } } } }` |
| `sources.json` | `{ placeholder, sources: Source[] }` |

Presets (`src/lib/presets.ts`) reference group ids; a test checks they exist.

## Engine (src/lib/engine.ts)

Per seat and dimension: seed = population share × turnout × national party share, raked (IPF, 20 iterations) so party totals match the real seat result and group totals stay ∝ share × turnout. Scenarios exclude / keep only chosen groups, then FPTP.
