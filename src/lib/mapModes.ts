/**
 * Helpers for the hex map's colour modes and the seat search.
 */
import type { Constituency, ElectionEvent, PartyId, Scenario, SeatResult } from "./types";
import type { RegionAllocation } from "./systems";
import { keptGroups } from "./engine";

/**
 * Regional lists elect MPs per region, not per seat. To draw that on a seat map, give each
 * region's hexes to parties so the counts match the region's seats, placing each party's
 * seats where it did best (greedy on vote share). It's a picture of the totals, not a claim
 * about which constituency an MP would "hold".
 */
export function assignRegionalSeats(
  seatResults: SeatResult[],
  regions: RegionAllocation[],
): Record<string, PartyId> {
  const out: Record<string, PartyId> = {};
  for (const r of regions) {
    const left: Record<PartyId, number> = { ...r.seats };
    const seats = seatResults.filter((s) => s.region === r.region);
    const pairs: { id: string; p: PartyId; share: number }[] = [];
    for (const s of seats)
      for (const p of Object.keys(left))
        if (left[p] > 0) pairs.push({ id: s.id, p, share: s.totalVotes > 0 ? (s.votes[p] ?? 0) / s.totalVotes : 0 });
    pairs.sort((a, b) => b.share - a.share || a.id.localeCompare(b.id));
    for (const { id, p } of pairs) {
      if (out[id] !== undefined || left[p] <= 0) continue;
      out[id] = p;
      left[p] -= 1;
    }
  }
  return out;
}

const LOSS = [217, 72, 15]; // burnt orange
const GAIN = [12, 133, 136]; // teal
const MID = [238, 234, 226]; // warm grey

/** Colour for a change in share points d (0..1 scale), on a diverging scale of ±scale. */
export function divergingColour(d: number, scale: number): string {
  const t = Math.max(-1, Math.min(1, scale > 0 ? d / scale : 0));
  const end = t < 0 ? LOSS : GAIN;
  const k = Math.abs(t);
  const c = MID.map((m, i) => Math.round(m + (end[i] - m) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** A tidy legend range (in share points, 0..1) that covers the biggest change. */
export function niceScale(maxAbs: number): number {
  const pts = maxAbs * 100;
  for (const s of [2, 5, 10, 15, 20, 30, 40, 50]) if (pts <= s) return s / 100;
  return 1;
}

/** Search seat names: prefix matches first, then word starts, then anywhere. Accent- and case-blind. */
export function searchSeats<T extends { name: string }>(items: T[], q: string, limit = 8): T[] {
  const norm = (x: string) =>
    x
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const n = norm(q);
  if (!n) return [];
  const scored: [number, T][] = [];
  for (const it of items) {
    const name = norm(it.name);
    const i = name.indexOf(n);
    if (i < 0) continue;
    const rank = i === 0 ? 0 : name[i - 1] === " " ? 1 : 2;
    scored.push([rank, it]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name));
  return scored.slice(0, limit).map(([, it]) => it);
}

export interface MixRow {
  id: string;
  label: string;
  emoji: string;
  /** This seat's share of voters. */
  local: number;
  national: number;
  /** Still voting under the scenario. */
  kept: boolean;
}

/** A seat's voter mix for one dimension: its own Census-based mix if it has one, else national. */
export function seatVoterMix(
  event: ElectionEvent,
  seat: Constituency,
  dimension: string,
  scenario: Scenario | null,
): { rows: MixRow[]; local: boolean } | null {
  const dim = event.dimensions.find((d) => d.id === dimension);
  const gv = event.groupVoting[dimension];
  if (!dim || !gv) return null;
  const localMix = seat.groupShares?.[dimension];
  const kept = new Set(
    scenario && scenario.dimension === dimension ? keptGroups(scenario, dim.groups.map((g) => g.id)) : dim.groups.map((g) => g.id),
  );
  const rows = dim.groups.map((g) => ({
    id: g.id,
    label: g.label,
    emoji: g.emoji,
    national: gv.groups[g.id]?.voterShare ?? 0,
    local: localMix ? (localMix[g.id] ?? 0) : (gv.groups[g.id]?.voterShare ?? 0),
    kept: kept.has(g.id),
  }));
  return { rows, local: !!localMix };
}
