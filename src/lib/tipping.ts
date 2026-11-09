/**
 * Tipping points: the smallest change in one group's turnout that changes the big result.
 * For a general election that's who governs (a majority won or lost, or a new largest party);
 * for a referendum, which side wins. For each group we try "they all stay home" and "the most
 * extra turnout the dial allows", and where that tips the result we home in on the smallest
 * change that still does it.
 */
import { maxTurnoutFactor, runScenario, type Model } from "./engine";
import { allocateSeats, formGovernment, type VotingSystem } from "./systems";
import type { DimensionId, ElectionEvent, GroupId, PartyId, Scenario, ScenarioResult } from "./types";

/** "government": who governs (or which side wins). "opposition": who comes second. */
export type TipLevel = "government" | "opposition";

export interface Outcome {
  /** Equal keys mean the same big result. */
  key: string;
  /** Second-largest party (general elections), i.e. the official opposition if nobody does a deal. */
  second: PartyId | null;
  /** Party with a majority, or the largest party (general); winning side (referendum). */
  party: PartyId | null;
  majority: boolean;
}

export function outcomeOf(event: ElectionEvent, result: ScenarioResult, system: VotingSystem = "fptp"): Outcome {
  if (event.kind === "referendum") {
    const [win] = Object.entries(result.voteShares).sort((a, b) => b[1] - a[1]);
    return { key: `win:${win?.[0]}`, party: win?.[0] ?? null, majority: true, second: null };
  }
  const seats = allocateSeats(system, result);
  const f = formGovernment(event.id, seats);
  const ranked = Object.entries(seats)
    .filter(([p]) => p !== "spk")
    .sort((a, b) => b[1] - a[1]);
  const second = ranked[1] && ranked[1][1] > 0 && ranked[1][1] !== ranked[2]?.[1] ? ranked[1][0] : null;
  if (f.majorityParty) return { key: `maj:${f.majorityParty}`, party: f.majorityParty, majority: true, second };
  const largest = ranked[0]?.[0] ?? null;
  // A dead heat for first place is its own outcome.
  const tie = ranked.length > 1 && ranked[0][1] === ranked[1][1];
  return { key: tie ? "hung:tie" : `hung:${largest}`, party: tie ? null : largest, majority: false, second };
}

/** What counts as "the same result" at each level. */
export function levelKey(o: Outcome, level: TipLevel): string {
  return level === "government" ? o.key : `${o.key}|2:${o.second}`;
}

export interface TippingPoint {
  level: TipLevel;
  dimension: DimensionId;
  group: GroupId;
  /** Turnout multiplier that tips it (below 1: some stay home; above 1: extra voters). */
  factor: number;
  /** Share of all real voters added or removed (0..1). */
  moved: number;
  outcome: Outcome;
  scenario: Scenario;
}

const STEPS = 8;

/**
 * Tipping points for one group, at most one each way (fewer voters, more voters).
 * Factors are rounded to whole percentage points, in the direction that still tips it.
 */
export function tippingForGroup(
  model: Model,
  event: ElectionEvent,
  dimension: DimensionId,
  group: GroupId,
  system: VotingSystem = "fptp",
  level: TipLevel = "government",
  base: Outcome = outcomeOf(event, model.baseline, system),
): TippingPoint[] {
  const same = (o: Outcome) => levelKey(o, level) === levelKey(base, level);
  const gv = event.groupVoting[dimension]?.groups[group];
  if (!gv) return [];
  const run = (f: number) =>
    runScenario(model, { dimension, mode: "turnout", groups: [], turnout: { [group]: f } });
  const out: TippingPoint[] = [];
  const max = maxTurnoutFactor(gv.turnout);
  for (const end of [0, max]) {
    if (end === 1) continue;
    const endOutcome = outcomeOf(event, run(end), system);
    if (same(endOutcome)) continue;
    // Bisect between 1 (real result) and `end` (tipped) for the change closest to 1.
    let near = 1;
    let far = end;
    let farOutcome = endOutcome;
    for (let i = 0; i < STEPS; i++) {
      const mid = (near + far) / 2;
      const o = outcomeOf(event, run(mid), system);
      if (same(o)) near = mid;
      else {
        far = mid;
        farOutcome = o;
      }
    }
    // Round to a whole percent on the tipped side, then check it still tips.
    let factor = end < 1 ? Math.floor(far * 100) / 100 : Math.ceil(far * 100) / 100;
    factor = Math.min(Math.max(factor, 0), max);
    const check = outcomeOf(event, run(factor), system);
    if (same(check)) factor = far;
    else farOutcome = check;
    out.push({
      level,
      dimension,
      group,
      factor,
      moved: gv.voterShare * Math.abs(1 - factor),
      outcome: farOutcome,
      scenario: { dimension, mode: "turnout", groups: [], turnout: { [group]: factor } },
    });
  }
  return out;
}

/** Every (slice, group) pair the finder will try, in order. */
export function tippingJobs(event: ElectionEvent): [DimensionId, GroupId][] {
  return event.dimensions.flatMap((d) => d.groups.map((g) => [d.id, g.id] as [DimensionId, GroupId]));
}

/** The cheapest tipping point for each different outcome, cheapest first. */
export function bestTippingPoints(points: TippingPoint[], limit = 6): TippingPoint[] {
  const sorted = [...points].sort((a, b) => a.moved - b.moved);
  const out: TippingPoint[] = [];
  const perOutcome = new Map<string, number>();
  for (const p of sorted) {
    const k = levelKey(p.outcome, p.level);
    const n = perOutcome.get(k) ?? 0;
    // Up to two routes to each outcome, so one doesn't crowd out the rest.
    if (n >= 2) continue;
    perOutcome.set(k, n + 1);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

/** All tipping points in one go (tests and small events; the page runs the jobs in chunks). */
export function findTippingPoints(
  model: Model,
  event: ElectionEvent,
  system: VotingSystem = "fptp",
  level: TipLevel = "government",
): TippingPoint[] {
  const base = outcomeOf(event, model.baseline, system);
  return tippingJobs(event).flatMap(([d, g]) => tippingForGroup(model, event, d, g, system, level, base));
}
