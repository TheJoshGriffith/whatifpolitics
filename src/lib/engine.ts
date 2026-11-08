/**
 * The "What If Britain…?" engine. Pure functions only: no React, no I/O.
 *
 * Pipeline per seat, per dimension:
 *   w[g]       = national share of voters in group g (or, if the seat has
 *                Census shares, popShare[g] × turnout[g])
 *   seed[g][p] = w[g] × share[g][p]
 *   rake (IPF) so that
 *     Σ_g votes[g][p] = actual 2024 votes for party p in the seat     (column targets)
 *     Σ_p votes[g][p] ∝ w[g], scaled to total                        (row targets)
 * then a scenario drops (or keeps only) some groups and we re-run FPTP.
 */
import type {
  Constituency,
  Dimension,
  DimensionId,
  FlippedSeat,
  GovernmentOutcome,
  GroupId,
  GroupPartyVotes,
  GroupVoting,
  Party,
  PartyId,
  Scenario,
  ScenarioResult,
  SeatResult,
} from "./types";

const EPS = 1e-9;
export const DEFAULT_ITERATIONS = 20;

export interface ModelInput {
  parties: Party[];
  dimensions: Dimension[];
  constituencies: Constituency[];
  groupVoting: GroupVoting;
}

/**
 * Iterative proportional fitting of a group×party matrix.
 * `seed` rows are groups, columns parties. Returns a new matrix whose column
 * sums match `colTargets` and row sums match `rowTargets` (as closely as
 * `iterations` allows; we finish on a column pass so party totals are exact).
 */
export function rake(
  seed: number[][],
  rowTargets: number[],
  colTargets: number[],
  iterations = DEFAULT_ITERATIONS,
): number[][] {
  const rows = seed.length;
  const cols = colTargets.length;
  // Tiny floor so a zero seed cell can still pick up votes if a target needs it.
  const m = seed.map((r, i) =>
    Array.from({ length: cols }, (_, j) =>
      colTargets[j] > 0 && rowTargets[i] > 0 ? Math.max(r[j] ?? 0, EPS) : 0,
    ),
  );
  for (let it = 0; it < iterations; it++) {
    // rows
    for (let i = 0; i < rows; i++) {
      const s = m[i].reduce((a, b) => a + b, 0);
      const f = s > 0 ? rowTargets[i] / s : 0;
      for (let j = 0; j < cols; j++) m[i][j] *= f;
    }
    // columns (last, so party totals are exact)
    for (let j = 0; j < cols; j++) {
      let s = 0;
      for (let i = 0; i < rows; i++) s += m[i][j];
      const f = s > 0 ? colTargets[j] / s : 0;
      for (let i = 0; i < rows; i++) m[i][j] *= f;
    }
  }
  return m;
}

/** Estimate group×party votes in one seat for one dimension. */
export function estimateSeatGroupVotes(
  seat: Constituency,
  dimension: Dimension,
  groupVoting: GroupVoting,
  partyIds: PartyId[],
  iterations = DEFAULT_ITERATIONS,
): GroupPartyVotes {
  const gv = groupVoting[dimension.id];
  const seatShares = seat.groupShares?.[dimension.id];
  const groups = dimension.groups.map((g) => g.id);

  // Expected share of this seat's voters in each group.
  const weights = groups.map((g) => {
    const beh = gv?.groups[g];
    if (seatShares) return seatShares[g] ?? 0;
    return beh?.voterShare ?? 0;
  });
  const seed = groups.map((g, i) =>
    partyIds.map((p) => weights[i] * (gv?.groups[g]?.shares[p] ?? 0)),
  );

  const colTargets = partyIds.map((p) => seat.votes[p] ?? 0);
  const total = colTargets.reduce((a, b) => a + b, 0);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const rowTargets = weights.map((w) => (wSum > 0 ? (total * w) / wSum : 0));

  const m = rake(seed, rowTargets, colTargets, iterations);
  const out: GroupPartyVotes = {};
  groups.forEach((g, i) => {
    out[g] = {};
    partyIds.forEach((p, j) => (out[g][p] = m[i][j]));
  });
  return out;
}

/** Precompute raked estimates for every seat & dimension. Cache this. */
export type Model = {
  input: ModelInput;
  partyIds: PartyId[];
  /** seatId -> dimensionId -> group -> party -> votes */
  estimates: Record<string, Partial<Record<DimensionId, GroupPartyVotes>>>;
  baseline: ScenarioResult;
};

export function buildModel(
  input: ModelInput,
  iterations = DEFAULT_ITERATIONS,
): Model {
  const partyIds = input.parties.map((p) => p.id);
  const estimates: Model["estimates"] = {};
  for (const seat of input.constituencies) {
    estimates[seat.id] = {};
    for (const dim of input.dimensions) {
      estimates[seat.id][dim.id] = estimateSeatGroupVotes(
        seat,
        dim,
        input.groupVoting,
        partyIds,
        iterations,
      );
    }
  }
  const baselineSeats = input.constituencies.map((c) =>
    seatResult(c, c.votes, partyIds),
  );
  const partial = { input, partyIds, estimates } as Omit<Model, "baseline">;
  const baseline = summarise(partial, null, baselineSeats, baselineSeats);
  return { ...partial, baseline };
}

/** Which groups' votes survive a scenario? (Ignores any second slice.) */
export function keptGroups(
  scenario: Scenario,
  allGroups: GroupId[],
): GroupId[] {
  const f = scenarioFactors(scenario, allGroups);
  return allGroups.filter((g) => f[g][0] > 0);
}

/** Turnout dials run from "stayed home" (0) to double the real turnout (2). */
export const MAX_TURNOUT_FACTOR = 2;

/**
 * Highest sensible dial for a group: 200%, or less if that would push its real
 * turnout (when a poll gives one) past 100%.
 */
export function maxTurnoutFactor(realTurnout: number | null | undefined): number {
  return typeof realTurnout === "number" && realTurnout > 0
    ? Math.min(MAX_TURNOUT_FACTOR, 1 / realTurnout)
    : MAX_TURNOUT_FACTOR;
}

/**
 * Per group of the scenario's main slice: [multiplier for its voters inside the
 * second slice (`and`), multiplier for its voters outside it]. Without a second
 * slice only the first number matters.
 */
export function scenarioFactors(
  scenario: Scenario,
  allGroups: GroupId[],
): Record<GroupId, [number, number]> {
  const chosen = new Set(scenario.groups);
  const out: Record<GroupId, [number, number]> = {};
  for (const g of allGroups) {
    if (scenario.mode === "turnout") {
      const d = scenario.turnout?.[g];
      const f = typeof d === "number" && Number.isFinite(d) ? d : 1;
      out[g] = [Math.min(Math.max(f, 0), MAX_TURNOUT_FACTOR), 1];
    } else if (scenario.mode === "only") out[g] = [chosen.has(g) ? 1 : 0, 0];
    else out[g] = [chosen.has(g) ? 0 : 1, 1];
  }
  return out;
}

/** The scenario's second slice, if it's usable (a different dimension with groups ticked). */
export function activeFilter(
  scenario: Scenario,
  dimensions: Dimension[],
): { dimension: Dimension; groups: GroupId[] } | null {
  const f = scenario.and;
  if (!f || f.dimension === scenario.dimension) return null;
  const dim = dimensions.find((d) => d.id === f.dimension);
  if (!dim) return null;
  const groups = f.groups.filter((g) => dim.groups.some((x) => x.id === g));
  return groups.length ? { dimension: dim, groups } : null;
}

/** true when a scenario changes nothing (no groups ticked, or every dial at 100%). */
export function isNoOp(scenario: Scenario): boolean {
  if (scenario.mode === "turnout")
    return Object.values(scenario.turnout ?? {}).every((f) => f === 1);
  return scenario.groups.length === 0;
}

export function seatResult(
  seat: Pick<Constituency, "id" | "name" | "region">,
  votes: Record<PartyId, number>,
  partyIds: PartyId[],
): SeatResult {
  let winner: PartyId | null = null;
  let best = 0;
  let second = 0;
  let total = 0;
  for (const p of partyIds) {
    const v = votes[p] ?? 0;
    total += v;
    if (v > best) {
      second = best;
      best = v;
      winner = p;
    } else if (v > second) {
      second = v;
    }
  }
  return {
    id: seat.id,
    name: seat.name,
    region: seat.region,
    votes,
    totalVotes: total,
    winner,
    margin: total > 0 ? (best - second) / total : 0,
  };
}

/** Butler swing from party a to party b between two results for the same seat (share points, 0..1). */
export function butlerSwing(
  before: SeatResult,
  after: SeatResult,
  a: PartyId,
  b: PartyId,
): number {
  const sh = (r: SeatResult, p: PartyId) =>
    r.totalVotes > 0 ? (r.votes[p] ?? 0) / r.totalVotes : 0;
  return (sh(after, b) - sh(before, b) - (sh(after, a) - sh(before, a))) / 2;
}

/**
 * Apply a scenario to a prebuilt model.
 *
 * With a second slice B, the votes of a cell (group g of A, group h of B) for party
 * p are estimated as estA[g][p] × estB[h][p] / votes[p]: within each party's voters,
 * we assume A and B are independent. That keeps both slices' totals exact.
 */
export function runScenario(
  model: Model,
  scenario: Scenario | null,
): ScenarioResult {
  if (!scenario) return model.baseline;
  const dim = model.input.dimensions.find((d) => d.id === scenario.dimension);
  if (!dim) throw new Error(`Unknown dimension: ${scenario.dimension}`);
  const groupIds = dim.groups.map((g) => g.id);
  const factors = scenarioFactors(scenario, groupIds);
  const filter = activeFilter(scenario, model.input.dimensions);
  const { partyIds } = model;
  const seats = model.input.constituencies.map((c) => {
    const est = model.estimates[c.id][dim.id] ?? {};
    const estB = filter ? (model.estimates[c.id][filter.dimension.id] ?? {}) : null;
    const votes: Record<PartyId, number> = {};
    for (const p of partyIds) {
      // Share of this party's voters who are in the second slice (1 without one).
      let inside = 1;
      if (estB && filter) {
        let all = 0;
        let sel = 0;
        for (const h of filter.dimension.groups) {
          const v = estB[h.id]?.[p] ?? 0;
          all += v;
          if (filter.groups.includes(h.id)) sel += v;
        }
        inside = all > 0 ? sel / all : 0;
      }
      let v = 0;
      for (const g of groupIds) {
        const [fin, fout] = factors[g];
        v += (est[g]?.[p] ?? 0) * (fin * inside + fout * (1 - inside));
      }
      votes[p] = v;
    }
    return seatResult(c, votes, partyIds);
  });
  return summarise(model, scenario, seats, model.baseline.seatResults);
}

/** Convenience one-shot (builds the model each call — fine for tests). */
export function simulate(
  input: ModelInput,
  scenario: Scenario | null,
): ScenarioResult {
  return runScenario(buildModel(input), scenario);
}

function summarise(
  model: Pick<Model, "input" | "partyIds">,
  scenario: Scenario | null,
  seatResults: SeatResult[],
  baselineSeats: SeatResult[],
): ScenarioResult {
  const { partyIds } = model;
  const seats: Record<PartyId, number> = {};
  const votes: Record<PartyId, number> = {};
  for (const p of partyIds) {
    seats[p] = 0;
    votes[p] = 0;
  }
  let totalVotes = 0;
  for (const s of seatResults) {
    if (s.winner) seats[s.winner] += 1;
    for (const p of partyIds) votes[p] += s.votes[p] ?? 0;
    totalVotes += s.totalVotes;
  }
  const voteShares: Record<PartyId, number> = {};
  for (const p of partyIds)
    voteShares[p] = totalVotes > 0 ? votes[p] / totalVotes : 0;

  const baseById = new Map(baselineSeats.map((s) => [s.id, s]));
  const flipped: FlippedSeat[] = [];
  for (const s of seatResults) {
    const b = baseById.get(s.id);
    if (b && b.winner && s.winner && b.winner !== s.winner) {
      flipped.push({
        id: s.id,
        name: s.name,
        region: s.region,
        from: b.winner,
        to: s.winner,
        originalMargin: b.margin,
        newMargin: s.margin,
        swing: butlerSwing(b, s, b.winner, s.winner),
      });
    }
  }
  flipped.sort((a, b) => b.swing - a.swing);

  const government = governmentOutcome(seats, seatResults.length, partyIds);
  return {
    scenario,
    seats,
    votes,
    voteShares,
    totalVotes,
    seatResults,
    flipped,
    government,
    headline: headline(government, flipped.length, model.input.parties),
  };
}

export function majorityNeeded(totalSeats: number): number {
  return Math.floor(totalSeats / 2) + 1;
}

export function governmentOutcome(
  seats: Record<PartyId, number>,
  totalSeats: number,
  partyIds: PartyId[],
): GovernmentOutcome {
  const needed = majorityNeeded(totalSeats);
  const ranked = [...partyIds].sort(
    (a, b) => (seats[b] ?? 0) - (seats[a] ?? 0),
  );
  const largest = ranked[0] && seats[ranked[0]] > 0 ? ranked[0] : null;
  const largestSeats = largest ? seats[largest] : 0;
  const hasMajority = largestSeats >= needed;
  // Commons convention: majority = seats − everyone else
  const majority = largestSeats - (totalSeats - largestSeats);

  let possibleDeal: PartyId[] | null = null;
  if (largest && !hasMajority) {
    const deal: PartyId[] = [largest];
    let sum = largestSeats;
    // Add the biggest remaining party each time: maths, not friendships.
    for (const p of ranked.slice(1)) {
      if (sum >= needed) break;
      if ((seats[p] ?? 0) === 0) break;
      deal.push(p);
      sum += seats[p];
    }
    possibleDeal = sum >= needed ? deal : null;
  }

  return {
    totalSeats,
    majorityNeeded: needed,
    largestParty: largest,
    largestPartySeats: largestSeats,
    hasMajority,
    majority,
    possibleDeal,
  };
}

export function headline(
  gov: GovernmentOutcome,
  flips: number,
  parties: Party[],
): string {
  const name = parties.find((p) => p.id === gov.largestParty)?.name ?? "Nobody";
  if (!gov.largestParty)
    return "Nobody voted. The returning officer has gone home early.";
  if (!gov.hasMajority) {
    return `Hung parliament! ${name} are the biggest gang but ${gov.majorityNeeded - gov.largestPartySeats} short of the ${gov.majorityNeeded} they need. Cue frantic phone calls.`;
  }
  const share = gov.largestPartySeats / Math.max(gov.totalSeats, 1);
  if (share >= 0.75)
    return `${name} by a country mile. The opposition could fit in a minibus.`;
  if (share >= 0.6)
    return `A whopping ${name} landslide. Somebody fetch the bunting.`;
  if (flips === 0)
    return `${name} win and… nothing changes. Not a single seat budges. Very British.`;
  // ≈ a majority of 20 or fewer in a 650-seat House
  if (gov.majority <= Math.max(1, Math.round(gov.totalSeats * 0.03)))
    return `${name} scrape over the line. Every backbencher just got a lot more important.`;
  return `${name} take it with a comfy majority. Kettle on.`;
}
