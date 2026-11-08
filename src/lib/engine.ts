/**
 * The "What If Britain…?" engine. Pure functions only: no React, no I/O.
 *
 * Pipeline per seat, per dimension:
 *   seed[g][p] = popShare[g] × turnout[g] × share[g][p]
 *   rake (IPF) so that
 *     Σ_g votes[g][p] = actual 2024 votes for party p in the seat     (column targets)
 *     Σ_p votes[g][p] ∝ popShare[g] × turnout[g], scaled to total     (row targets)
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
  const shares = seat.groupShares[dimension.id] ?? {};
  const groups = dimension.groups.map((g) => g.id);

  const seed = groups.map((g) => {
    const pop = shares[g] ?? 0;
    const beh = gv?.groups[g];
    const turnout = beh?.turnout ?? 0;
    return partyIds.map((p) => pop * turnout * (beh?.shares[p] ?? 0));
  });

  const colTargets = partyIds.map((p) => seat.votes[p] ?? 0);
  const total = colTargets.reduce((a, b) => a + b, 0);
  const weights = groups.map((g) => (shares[g] ?? 0) * (gv?.groups[g]?.turnout ?? 0));
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

export function buildModel(input: ModelInput, iterations = DEFAULT_ITERATIONS): Model {
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
  const baselineSeats = input.constituencies.map((c) => seatResult(c, c.votes, partyIds));
  const partial = { input, partyIds, estimates } as Omit<Model, "baseline">;
  const baseline = summarise(partial, null, baselineSeats, baselineSeats);
  return { ...partial, baseline };
}

/** Which groups' votes survive a scenario? */
export function keptGroups(scenario: Scenario, allGroups: GroupId[]): GroupId[] {
  const chosen = new Set(scenario.groups);
  return scenario.mode === "exclude"
    ? allGroups.filter((g) => !chosen.has(g))
    : allGroups.filter((g) => chosen.has(g));
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

/** Apply a scenario to a prebuilt model. */
export function runScenario(model: Model, scenario: Scenario | null): ScenarioResult {
  if (!scenario) return model.baseline;
  const dim = model.input.dimensions.find((d) => d.id === scenario.dimension);
  if (!dim) throw new Error(`Unknown dimension: ${scenario.dimension}`);
  const kept = keptGroups(
    scenario,
    dim.groups.map((g) => g.id),
  );
  const { partyIds } = model;
  const seats = model.input.constituencies.map((c) => {
    const est = model.estimates[c.id][dim.id] ?? {};
    const votes: Record<PartyId, number> = {};
    for (const p of partyIds) {
      let v = 0;
      for (const g of kept) v += est[g]?.[p] ?? 0;
      votes[p] = v;
    }
    return seatResult(c, votes, partyIds);
  });
  return summarise(model, scenario, seats, model.baseline.seatResults);
}

/** Convenience one-shot (builds the model each call — fine for tests). */
export function simulate(input: ModelInput, scenario: Scenario | null): ScenarioResult {
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
  for (const p of partyIds) voteShares[p] = totalVotes > 0 ? votes[p] / totalVotes : 0;

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
      });
    }
  }
  flipped.sort((a, b) => b.originalMargin - a.originalMargin);

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
  const ranked = [...partyIds].sort((a, b) => (seats[b] ?? 0) - (seats[a] ?? 0));
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

export function headline(gov: GovernmentOutcome, flips: number, parties: Party[]): string {
  const name = parties.find((p) => p.id === gov.largestParty)?.name ?? "Nobody";
  if (!gov.largestParty) return "Nobody voted. The returning officer has gone home early.";
  if (!gov.hasMajority) {
    return `Hung parliament! ${name} are the biggest gang but short of ${gov.majorityNeeded}. Cue frantic phone calls.`;
  }
  const share = gov.largestPartySeats / Math.max(gov.totalSeats, 1);
  if (share >= 0.75) return `${name} by a country mile. The opposition could fit in a minibus.`;
  if (share >= 0.6) return `A whopping ${name} landslide. Somebody fetch the bunting.`;
  if (flips === 0) return `${name} win and… nothing changes. Not a single seat budges. Very British.`;
  // ≈ a majority of 20 or fewer in a 650-seat House
  if (gov.majority <= Math.max(1, Math.round(gov.totalSeats * 0.03)))
    return `${name} scrape over the line. Every backbencher just got a lot more important.`;
  return `${name} take it with a comfy majority. Kettle on.`;
}
