"use client";

import { useMemo, useState } from "react";
import type { EventMap, Party, PartyId, SeatResult } from "@/lib/types";

const S = 10; // hex radius
const W = Math.sqrt(3) * S;

function hexPath(cx: number, cy: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + S * Math.cos(a)).toFixed(2)},${(cy + S * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

interface Cell {
  id: string;
  name: string;
  x: number;
  y: number;
  d: string;
  winner: PartyId | null;
  was: PartyId | null;
  margin: number;
  wasMargin: number;
}

function tally(members: string[], byId: Map<string, SeatResult>) {
  const votes: Record<string, number> = {};
  let total = 0;
  for (const m of members) {
    const s = byId.get(m);
    if (!s) continue;
    for (const [p, v] of Object.entries(s.votes)) votes[p] = (votes[p] ?? 0) + v;
    total += s.totalVotes;
  }
  const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  if (!sorted.length || sorted[0][1] <= 0) return { winner: null, margin: 0 };
  return { winner: sorted[0][0], margin: total > 0 ? (sorted[0][1] - (sorted[1]?.[1] ?? 0)) / total : 0 };
}

export function HexMap({
  map,
  seatResults,
  baselineResults,
  parties,
  areaWord = "seat",
  isBaseline,
}: {
  map: EventMap;
  seatResults: SeatResult[];
  baselineResults: SeatResult[];
  parties: Party[];
  areaWord?: string;
  isBaseline: boolean;
}) {
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const colour = useMemo(() => new Map(parties.map((p) => [p.id, p.colour])), [parties]);
  const pname = (id: PartyId | null) => (id ? (parties.find((p) => p.id === id)?.short ?? id) : "nobody");

  const geom = useMemo(() => {
    const pts = map.hexes.map(([id, name, q, r]) => ({
      id,
      name,
      x: W * (q + ((r & 1) === 1 ? 0.5 : 0)),
      y: -1.5 * S * r,
    }));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) - W;
    const minY = Math.min(...ys) - S * 1.5;
    return {
      pts,
      box: `${minX.toFixed(1)} ${minY.toFixed(1)} ${(Math.max(...xs) + W - minX).toFixed(1)} ${(Math.max(...ys) + S * 1.5 - minY).toFixed(1)}`,
    };
  }, [map]);

  const baseTally = useMemo(() => {
    const byId = new Map(baselineResults.map((s) => [s.id, s]));
    return map.hexes.map((h) => tally(h[4] ?? [h[0]], byId));
  }, [map, baselineResults]);

  const cells: Cell[] = useMemo(() => {
    const byId = new Map(seatResults.map((s) => [s.id, s]));
    return map.hexes.map((h, i) => {
      const t = tally(h[4] ?? [h[0]], byId);
      const p = geom.pts[i];
      return {
        ...p,
        d: hexPath(p.x, p.y),
        winner: t.winner,
        margin: t.margin,
        was: baseTally[i].winner,
        wasMargin: baseTally[i].margin,
      };
    });
  }, [map, seatResults, geom, baseTally]);

  const changed = cells.filter((c) => c.winner !== c.was).length;
  const sel = cells.find((c) => c.id === picked) ?? null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-bold text-muted">
          {isBaseline ? `The real result, ${areaWord} by ${areaWord}` : `${changed} ${areaWord}${changed === 1 ? "" : "s"} change hands`}
        </span>
        {!isBaseline && (
          <label className="flex cursor-pointer items-center gap-2 font-bold">
            <input
              type="checkbox"
              checked={onlyChanges}
              onChange={(e) => setOnlyChanges(e.target.checked)}
              className="h-4 w-4 accent-pink"
            />
            Spotlight the changes
          </label>
        )}
      </div>
      <svg
        viewBox={geom.box}
        className="mx-auto h-auto max-h-[70vh] w-full"
        role="img"
        aria-label={`Hex map: one hexagon per ${areaWord}, coloured by winner`}
        onMouseLeave={() => setPicked(null)}
      >
        {cells.map((c) => {
          const flip = c.winner !== c.was;
          const dim = onlyChanges && !flip;
          return (
            <path
              key={c.id}
              d={c.d}
              fill={c.winner ? (colour.get(c.winner) ?? "#ccc") : "#e5e1d8"}
              stroke={c.id === picked ? "#1f1a3d" : flip && !isBaseline ? "#1f1a3d" : "#fffaf0"}
              strokeWidth={c.id === picked ? 2.4 : flip && !isBaseline ? 1.6 : 0.8}
              opacity={dim ? 0.18 : 1}
              onMouseEnter={() => setPicked(c.id)}
              onClick={() => setPicked(c.id)}
              className="cursor-pointer"
            >
              <title>{c.name}</title>
            </path>
          );
        })}
      </svg>
      <p className="min-h-[2.75rem] rounded-2xl bg-paper px-3 py-2 text-sm ring-1 ring-ink/15" aria-live="polite">
        {sel ? (
          <>
            <b>{sel.name}</b>:{" "}
            {isBaseline || sel.winner === sel.was ? (
              <>
                {pname(sel.winner)} by {(sel.margin * 100).toFixed(1)}%
                {!isBaseline && <span className="text-muted"> (no change)</span>}
              </>
            ) : (
              <>
                <b>{pname(sel.winner)}</b> by {(sel.margin * 100).toFixed(1)}%{" "}
                <span className="text-muted">
                  (really {pname(sel.was)} by {(sel.wasMargin * 100).toFixed(1)}%)
                </span>
              </>
            )}
          </>
        ) : (
          <span className="text-muted">Hover or tap a hexagon to see who wins there. Every {areaWord} is the same size, so London isn&apos;t a smudge.</span>
        )}
      </p>
    </div>
  );
}
