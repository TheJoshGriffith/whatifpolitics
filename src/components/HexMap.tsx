"use client";

import { useMemo, useState } from "react";
import type { EventMap, Party, PartyId, SeatResult } from "@/lib/types";
import type { RegionAllocation } from "@/lib/systems";
import { divergingColour, niceScale } from "@/lib/mapModes";

type ColourMode = "winner" | "swing" | "regional";

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
  members: string[];
  /** Real winner's vote share, really and under the scenario. */
  wasShare: number;
  nowShare: number;
  region: string;
  /** Party this hex goes to under regional lists, if that mode is available. */
  listParty: PartyId | null;
}

function tally(members: string[], byId: Map<string, SeatResult>, shareOf?: PartyId | null) {
  const votes: Record<string, number> = {};
  let total = 0;
  for (const m of members) {
    const s = byId.get(m);
    if (!s) continue;
    for (const [p, v] of Object.entries(s.votes)) votes[p] = (votes[p] ?? 0) + v;
    total += s.totalVotes;
  }
  const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const share = shareOf && total > 0 ? (votes[shareOf] ?? 0) / total : 0;
  const region = byId.get(members[0])?.region ?? "";
  if (!sorted.length || sorted[0][1] <= 0) return { winner: null, margin: 0, share, region };
  return {
    winner: sorted[0][0],
    margin: total > 0 ? (sorted[0][1] - (sorted[1]?.[1] ?? 0)) / total : 0,
    share: shareOf ? share : total > 0 ? sorted[0][1] / total : 0,
    region,
  };
}

export function HexMap({
  map,
  seatResults,
  baselineResults,
  parties,
  areaWord = "seat",
  isBaseline,
  highlight = null,
  onPick,
  regional,
  baselineLabel = "The real result",
}: {
  map: EventMap;
  seatResults: SeatResult[];
  baselineResults: SeatResult[];
  parties: Party[];
  areaWord?: string;
  isBaseline: boolean;
  /** A seat id to outline (e.g. from the seat search). */
  highlight?: string | null;
  /** Called with a seat id when a hexagon is clicked. */
  onPick?: (seatId: string) => void;
  /** Regional-list seats, when that voting system is chosen. */
  regional?: { seatParty: Record<string, PartyId>; regions: RegionAllocation[] };
  /** What the unchanged map shows, e.g. "The real result". */
  baselineLabel?: string;
}) {
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [modePick, setModePick] = useState<ColourMode | null>(null);
  const modes: [ColourMode, string][] = [["winner", "Winner"]];
  if (!isBaseline) modes.push(["swing", "Swing"]);
  if (regional) modes.push(["regional", "Region seats"]);
  const mode: ColourMode =
    modePick && modes.some(([m]) => m === modePick) ? modePick : regional ? "regional" : "winner";
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
      const members = h[4] ?? [h[0]];
      const t = tally(members, byId, baseTally[i].winner);
      const p = geom.pts[i];
      return {
        ...p,
        d: hexPath(p.x, p.y),
        winner: t.winner,
        margin: t.margin,
        was: baseTally[i].winner,
        wasMargin: baseTally[i].margin,
        members,
        wasShare: baseTally[i].share,
        nowShare: t.share,
        region: t.region,
        listParty: regional?.seatParty[members[0]] ?? null,
      };
    });
  }, [map, seatResults, geom, baseTally, regional]);

  const scale = useMemo(
    () => niceScale(Math.max(0, ...cells.map((c) => Math.abs(c.nowShare - c.wasShare)))),
    [cells],
  );
  const fillFor = (c: Cell) => {
    if (mode === "swing") return c.was ? divergingColour(c.nowShare - c.wasShare, scale) : "#e5e1d8";
    const p = mode === "regional" ? c.listParty : c.winner;
    return p ? (colour.get(p) ?? "#ccc") : "#e5e1d8";
  };

  const changed = cells.filter((c) => c.winner !== c.was).length;
  const hl = highlight ? (cells.find((c) => c.members.includes(highlight)) ?? null) : null;
  const sel = cells.find((c) => c.id === picked) ?? hl;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-bold text-muted">
          {isBaseline ? `${baselineLabel}, ${areaWord} by ${areaWord}` : `${changed} ${areaWord}${changed === 1 ? "" : "s"} change hands`}
        </span>
        {!isBaseline && mode === "winner" && (
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
      {modes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
          <span className="text-muted">Colour by</span>
          <div className="flex gap-1 rounded-full border-2 border-ink p-0.5" role="radiogroup" aria-label="Colour the map by">
            {modes.map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setModePick(m)}
                className={`rounded-full px-2.5 py-1 ${mode === m ? "bg-ink text-paper" : "hover:bg-sun"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <svg
        viewBox={geom.box}
        className="mx-auto h-auto max-h-[70vh] w-full"
        role="img"
        aria-label={`Hex map: one hexagon per ${areaWord}, coloured by ${
          mode === "swing" ? "change in the real winner's vote share" : mode === "regional" ? "regional-list seats" : "winner"
        }`}
        onMouseLeave={() => setPicked(null)}
      >
        {cells.map((c) => {
          const flip = mode === "winner" && c.winner !== c.was && !isBaseline;
          const dim = mode === "winner" && onlyChanges && !flip;
          const on = c.id === picked || c === hl;
          return (
            <path
              key={c.id}
              d={c.d}
              fill={fillFor(c)}
              stroke={on || flip ? "#1f1a3d" : "#fffaf0"}
              strokeWidth={on ? 2.4 : flip ? 1.6 : 0.8}
              opacity={dim ? 0.18 : 1}
              onMouseEnter={() => setPicked(c.id)}
              onClick={() => {
                setPicked(c.id);
                onPick?.(c.members[0]);
              }}
              className="cursor-pointer"
            >
              <title>{c.name}</title>
            </path>
          );
        })}
        {hl && (
          <g pointerEvents="none" aria-hidden>
            <path d={hl.d} fill="none" stroke="#1f1a3d" strokeWidth={4.5} />
            <path d={hl.d} fill="none" stroke="#ff5fa2" strokeWidth={2}>
              <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
            </path>
          </g>
        )}
      </svg>
      <p className="min-h-[2.75rem] rounded-2xl bg-paper px-3 py-2 text-sm ring-1 ring-ink/15" aria-live="polite">
        {sel && mode === "swing" ? (
          <>
            <b>{sel.name}</b>: {pname(sel.was)} really won with {(sel.wasShare * 100).toFixed(1)}%. Here they get{" "}
            {(sel.nowShare * 100).toFixed(1)}% (
            {sel.nowShare >= sel.wasShare ? "+" : "−"}
            {(Math.abs(sel.nowShare - sel.wasShare) * 100).toFixed(1)} points)
            {sel.winner !== sel.was && <>, and {pname(sel.winner)} take it</>}.
          </>
        ) : sel && mode === "regional" ? (
          <>
            <b>{sel.name}</b> ({sel.region}): shaded {pname(sel.listParty)} for the regional count.{" "}
            <span className="text-muted">
              Under first past the post: {pname(sel.winner)} by {(sel.margin * 100).toFixed(1)}%.
            </span>
          </>
        ) : sel ? (
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
      {regional && mode === "winner" && (
        <p className="text-xs text-muted">
          These are first-past-the-post winners. Regional lists have no constituency winners, so pick Region seats to see
          how each region shares out its MPs.
        </p>
      )}
      {mode === "swing" && <SwingLegend scale={scale} />}
      {mode === "regional" && regional && (
        <RegionList regions={regional.regions} colour={colour} pname={pname} />
      )}
    </div>
  );
}


function SwingLegend({ scale }: { scale: number }) {
  const steps = 9;
  const s = Math.round(scale * 100);
  return (
    <div className="flex flex-col gap-1 text-xs">
      <p className="font-bold">Change in the real winner&apos;s vote share, in points</p>
      <div
        className="h-3 rounded-full ring-1 ring-ink/20"
        role="img"
        aria-label={`Colour scale from minus ${s} points (orange) through no change (grey) to plus ${s} points (teal)`}
        style={{
          background: `linear-gradient(to right, ${Array.from({ length: steps }, (_, i) =>
            divergingColour(((i / (steps - 1)) * 2 - 1) * scale, scale),
          ).join(",")})`,
        }}
      />
      <div className="flex justify-between font-bold tabular-nums text-muted">
        <span>−{s} or more</span>
        <span>no change</span>
        <span>+{s} or more</span>
      </div>
    </div>
  );
}

function RegionList({
  regions,
  colour,
  pname,
}: {
  regions: RegionAllocation[];
  colour: Map<PartyId, string>;
  pname: (id: PartyId | null) => string;
}) {
  const sorted = [...regions].sort((a, b) => a.region.localeCompare(b.region));
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted">
        Regional lists elect MPs for a whole region, not one seat. Each region&apos;s hexagons are shaded to match its seats,
        with each party&apos;s seats placed where it polled best. Seats per region:
      </p>
      <ul className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
        {sorted.map((r) => {
          const parts = Object.entries(r.seats)
            .filter(([, n]) => n > 0)
            .sort((a, b) => b[1] - a[1]);
          return (
            <li key={r.region} className="min-w-0">
              <p className="flex justify-between gap-2 font-bold">
                <span className="truncate">{r.region}</span>
                <span className="shrink-0 text-muted">{r.total} seats</span>
              </p>
              <div
                className="flex h-2.5 gap-px overflow-hidden rounded-full ring-1 ring-ink/20"
                role="img"
                aria-label={`${r.region}: ${parts.map(([p, n]) => `${pname(p)} ${n}`).join(", ")}`}
              >
                {parts.map(([p, n]) => (
                  <span
                    key={p}
                    title={`${pname(p)} ${n}`}
                    style={{ width: `${(n / r.total) * 100}%`, background: colour.get(p) ?? "#ccc" }}
                  />
                ))}
              </div>
              <p className="text-muted">{parts.map(([p, n]) => `${pname(p)} ${n}`).join(" · ")}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
