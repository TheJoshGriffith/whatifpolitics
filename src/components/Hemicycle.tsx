import type { Party, PartyId } from "@/lib/types";

interface Dot {
  x: number;
  y: number;
  angle: number;
  row: number;
}

const W = 200;
const CX = W / 2;
const CY = 100;
const OUTER = 96;
const INNER_RATIO = 0.38;

/** Lay out `n` seats in concentric semicircular rows (classic parliament chart). */
export function hemicycleLayout(n: number): { dots: Dot[]; r: number } {
  if (n <= 0) return { dots: [], r: 0 };
  const rows = Math.max(1, Math.min(14, Math.round(Math.sqrt(n / 3.6))));
  const inner = OUTER * INNER_RATIO;
  const radii = Array.from({ length: rows }, (_, i) =>
    rows === 1 ? (OUTER + inner) / 2 : inner + ((OUTER - inner) * i) / (rows - 1),
  );
  const totalR = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.max(1, Math.floor((n * r) / totalR)));
  // hand out leftovers to the outer rows
  let left = n - counts.reduce((a, b) => a + b, 0);
  for (let i = rows - 1; left > 0; i = (i - 1 + rows) % rows, left--) counts[i]++;
  for (let i = 0; left < 0; i = (i + 1) % rows) {
    if (counts[i] > 1) {
      counts[i]--;
      left++;
    }
  }

  const dots: Dot[] = [];
  radii.forEach((radius, row) => {
    const k = counts[row];
    for (let j = 0; j < k; j++) {
      const angle = k === 1 ? Math.PI / 2 : Math.PI - (Math.PI * j) / (k - 1);
      dots.push({ x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle), angle, row });
    }
  });
  // left-to-right sweep, so each party gets a wedge
  dots.sort((a, b) => b.angle - a.angle || a.row - b.row);

  const rowGap = rows > 1 ? (OUTER - inner) / (rows - 1) : OUTER - inner;
  const arcGap = Math.min(...radii.map((r, i) => (Math.PI * r) / Math.max(counts[i] - 1, 1)));
  const r = Math.min(rowGap, arcGap, 9.5) * 0.42;
  return { dots, r };
}

export function Hemicycle({
  seats,
  parties,
  majorityNeeded,
  label,
}: {
  seats: Record<PartyId, number>;
  parties: Party[];
  majorityNeeded: number;
  label: string;
}) {
  const order = parties.filter((p) => (seats[p.id] ?? 0) > 0);
  const n = order.reduce((a, p) => a + seats[p.id], 0);
  const { dots, r } = hemicycleLayout(n);
  const colours: string[] = [];
  for (const p of order) for (let i = 0; i < seats[p.id]; i++) colours.push(p.colour);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${(CY + Math.max(r, 4.5) + 1).toFixed(2)}`}
        role="img"
        aria-label={`${label}: ${order.map((p) => `${p.short} ${seats[p.id]}`).join(", ")}`}
        className="h-auto w-full"
      >
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x.toFixed(2)}
            cy={d.y.toFixed(2)}
            r={r.toFixed(2)}
            fill={colours[i]}
            stroke="rgba(31,26,61,0.35)"
            strokeWidth={Math.max(r * 0.12, 0.08)}
          />
        ))}
        <line
          x1={CX}
          x2={CX}
          y1={CY - OUTER - 3}
          y2={CY - OUTER * INNER_RATIO + 6}
          stroke="var(--ink)"
          strokeWidth="0.6"
          strokeDasharray="1.6 1.2"
        />
        <text
          x={CX}
          y={CY - 4}
          textAnchor="middle"
          className="fill-ink font-display"
          style={{ fontSize: 13, fontWeight: 800 }}
        >
          {n}
        </text>
        <text
          x={CX}
          y={CY + 3.2}
          textAnchor="middle"
          className="fill-muted"
          style={{ fontSize: 4.6, fontWeight: 700 }}
        >
          seats · {majorityNeeded} for a majority
        </text>
      </svg>
    </figure>
  );
}
