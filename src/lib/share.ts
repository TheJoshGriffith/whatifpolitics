/**
 * Shareable links: the whole what-if (vote, slice, mode, groups, second slice,
 * turnout dials and voting system) packed into a short query string, e.g.
 *   e=ge2019&d=age&m=only&g=18-19,20-24&d2=tenure&g2=private,social&s=pr
 * Pure functions; WhatIfApp decides where in the URL it lives.
 */
import type { DimensionId, ElectionEvent, GroupId, ScenarioFilter, ScenarioMode } from "./types";
import { MAX_TURNOUT_FACTOR } from "./engine";

export interface ShareState {
  eventId: string;
  dimension: DimensionId;
  mode: ScenarioMode;
  groups: GroupId[];
  /** Turnout dials, as multipliers (1 = as real). Only non-1 dials are kept. */
  turnout: Record<GroupId, number>;
  and: ScenarioFilter | null;
  system: string;
}

const MODES: ScenarioMode[] = ["exclude", "only", "turnout"];
// Ids are short slugs, so only escape what would break the format.
// "+" stays literal too: we decode with decodeURIComponent, which leaves it alone.
const enc = (s: string) =>
  encodeURIComponent(s).replace(/%2C/gi, ",").replace(/%3A/gi, ":").replace(/%2B/gi, "+");

/** Like URLSearchParams, but "+" means "+" (group ids such as "70+"). */
function parse(qs: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const bit of qs.replace(/^[?#]/, "").split("&")) {
    const i = bit.indexOf("=");
    if (i <= 0) continue;
    try {
      out.set(decodeURIComponent(bit.slice(0, i)), decodeURIComponent(bit.slice(i + 1)));
    } catch {
      // ignore a mangled bit
    }
  }
  return out;
}

export function encodeShare(s: ShareState, defaultSystem = "fptp"): string {
  const parts: [string, string][] = [
    ["e", s.eventId],
    ["d", s.dimension],
    ["m", s.mode],
  ];
  if (s.mode === "turnout") {
    const dials = Object.entries(s.turnout)
      .filter(([, f]) => f !== 1)
      .map(([g, f]) => `${g}:${Math.round(f * 100)}`);
    if (dials.length) parts.push(["t", dials.join(",")]);
  } else if (s.groups.length) parts.push(["g", s.groups.join(",")]);
  if (s.and && s.and.groups.length) {
    parts.push(["d2", s.and.dimension]);
    parts.push(["g2", s.and.groups.join(",")]);
  }
  if (s.system !== defaultSystem) parts.push(["s", s.system]);
  return parts.map(([k, v]) => `${k}=${enc(v)}`).join("&");
}

/**
 * Read a query string (with or without a leading "?") back into a state, checked
 * against the real events. Returns null if it doesn't name a known vote.
 */
export function decodeShare(
  qs: string,
  events: ElectionEvent[],
  systemIds: string[],
): ShareState | null {
  const q = parse(qs);
  const event = events.find((e) => e.id === q.get("e"));
  if (!event) return null;
  const list = (k: string) => (q.get(k) ?? "").split(",").filter(Boolean);
  const dim = event.dimensions.find((d) => d.id === q.get("d")) ?? event.dimensions[0];
  const has = (gs: { id: string }[], g: string) => gs.some((x) => x.id === g);
  const rawMode = q.get("m") as ScenarioMode | null;
  const mode: ScenarioMode = rawMode && MODES.includes(rawMode) ? rawMode : "only";
  const groups = dim.id === q.get("d") ? [...new Set(list("g"))].filter((g) => has(dim.groups, g)) : [];
  const turnout: Record<GroupId, number> = {};
  if (dim.id === q.get("d"))
    for (const bit of list("t")) {
      const [g, pct] = bit.split(":");
      const n = Number(pct);
      if (has(dim.groups, g) && Number.isFinite(n))
        turnout[g] = Math.min(Math.max(n / 100, 0), MAX_TURNOUT_FACTOR);
    }
  let and: ScenarioFilter | null = null;
  const d2 = event.dimensions.find((d) => d.id === q.get("d2"));
  if (d2 && d2.id !== dim.id) {
    const g2 = [...new Set(list("g2"))].filter((g) => has(d2.groups, g));
    if (g2.length) and = { dimension: d2.id, groups: g2 };
  }
  const s = q.get("s");
  const system = s && systemIds.includes(s) ? s : (systemIds[0] ?? "fptp");
  return { eventId: event.id, dimension: dim.id, mode, groups, turnout, and, system };
}
