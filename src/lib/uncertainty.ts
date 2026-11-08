/**
 * Error bars: how much could the answer move because the polls only asked so many people?
 *
 * Each group's party shares come from a poll of `n` people. We redraw plausible shares for every
 * group in the scenario's slice (a Dirichlet draw centred on the poll, with variance about
 * p(1-p)/n), re-rake every seat with those shares, re-run the scenario, and repeat. The spread of
 * the answers is the range we show. Pure functions only; it uses the public engine API.
 */
import { buildModel, runScenario, type ModelInput } from "./engine";
import { allocateSeats, undoTactical, type VotingSystem } from "./systems";
import type { GroupVoting, PartyId, Scenario } from "./types";

/** Below this many people a group's figures are shaky. */
export const SMALL_SAMPLE = 100;
/** Used when a poll gives no sample size at all (we always have one at the moment). */
const FALLBACK_N = 500;
/** ~30 ms a run for a 650-seat election (it re-rakes every seat), so 60 runs is about 2 s of
 *  background work, done a couple of runs at a time. */
export const DEFAULT_RUNS = 60;
/** Fewer raking passes than the main model: plenty for the spread, and about twice as fast. */
const ITERATIONS = 10;

/** Small, fast, seedable PRNG (mulberry32) so ranges don't jitter between renders. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(r: () => number): number {
  const u = 1 - r();
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Gamma(shape, 1) draw (Marsaglia & Tsang; boosted for shape < 1). */
export function gamma(shape: number, r: () => number): number {
  if (shape <= 0) return 0;
  if (shape < 1) return gamma(shape + 1, r) * Math.pow(r() || 1e-12, 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(r);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = r();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Plausible party shares for a group polled with `n` people: Dirichlet(n·p). Each share then has
 * mean p and variance p(1-p)/(n+1). Keeps the shares' original total (some files copy one share
 * into two party ids, so they can add up to a bit over 1).
 */
export function drawShares(shares: Record<PartyId, number>, n: number, r: () => number): Record<PartyId, number> {
  const ids = Object.keys(shares);
  const total = ids.reduce((a, p) => a + shares[p], 0);
  if (total <= 0) return { ...shares };
  const g = ids.map((p) => (shares[p] > 0 ? gamma((n * shares[p]) / total, r) : 0));
  const gs = g.reduce((a, b) => a + b, 0) || 1;
  const out: Record<PartyId, number> = {};
  ids.forEach((p, i) => (out[p] = (g[i] / gs) * total));
  return out;
}

export function perturbGroupVoting(gv: GroupVoting, dimension: string, r: () => number): GroupVoting {
  const d = gv[dimension];
  if (!d) return gv;
  const groups: GroupVoting[string]["groups"] = {};
  for (const [g, beh] of Object.entries(d.groups)) {
    groups[g] = { ...beh, shares: drawShares(beh.shares, beh.n ?? FALLBACK_N, r) };
  }
  return { ...gv, [dimension]: { ...d, groups } };
}

/** Value at quantile q (0..1) of an already-sorted array. */
export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export interface Range {
  lo: number;
  mid: number;
  hi: number;
}

export interface Uncertainty {
  runs: number;
  /** 10th, 50th and 90th percentile of seats per party (general elections). */
  seats: Record<PartyId, Range>;
  /** Same for national vote share (0..1). */
  shares: Record<PartyId, Range>;
  /** Share of runs in which each party won a working majority. */
  majority: Record<PartyId, number>;
  /** Share of runs with nobody over the line. */
  hung: number;
  /** Referendums: share of runs each side won the popular vote. */
  wins: Record<PartyId, number>;
  ms: number;
}

/** Same rule as formGovernment: Sinn Féin and the Speaker don't vote. */
const NON_VOTING = new Set(["sf", "spk"]);
export function majorityParty(seats: Record<PartyId, number>): PartyId | null {
  let voting = 0;
  let best: PartyId | null = null;
  for (const [p, n] of Object.entries(seats)) {
    if (NON_VOTING.has(p)) continue;
    voting += n;
    if (!best || n > seats[best]) best = p;
  }
  return best && seats[best] >= Math.floor(voting / 2) + 1 ? best : null;
}

export interface UncertaintyOptions {
  runs?: number;
  seed?: number;
  system?: VotingSystem;
  /** Event id when tactical votes should be undone under PR. */
  tacticalEventId?: string | null;
}

/** An in-progress set of noisy re-runs. Call step() a few runs at a time to stay interactive. */
export interface UncertaintyRun {
  /** Do up to k more runs. Returns true once all runs are done. */
  step(k: number): boolean;
  done(): number;
  total: number;
  /** Summary of the runs so far (null before the first). */
  result(): Uncertainty | null;
}

/**
 * Re-run a scenario with poll noise. Returns null for the real result (nobody left out),
 * where nothing depends on the polls.
 */
export function startUncertainty(
  input: ModelInput,
  scenario: Scenario | null,
  opts: UncertaintyOptions = {},
): UncertaintyRun | null {
  if (!scenario || !scenario.groups.length) return null;
  const dim = input.dimensions.find((d) => d.id === scenario.dimension);
  if (!dim) return null;
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const total = opts.runs ?? DEFAULT_RUNS;
  const system = opts.system ?? "fptp";
  const r = rng(opts.seed ?? 20240704);
  const partyIds = input.parties.map((p) => p.id);
  const seatDraws: Record<PartyId, number[]> = {};
  const shareDraws: Record<PartyId, number[]> = {};
  for (const p of partyIds) {
    seatDraws[p] = [];
    shareDraws[p] = [];
  }
  const majorityN: Record<PartyId, number> = {};
  const winsN: Record<PartyId, number> = {};
  let hungN = 0;
  let n = 0;
  let ms = 0;
  const one = () => {
    const model = buildModel(
      { ...input, dimensions: [dim], groupVoting: perturbGroupVoting(input.groupVoting, dim.id, r) },
      ITERATIONS,
    );
    let res = runScenario(model, scenario);
    if (system !== "fptp" && opts.tacticalEventId) res = undoTactical(opts.tacticalEventId, res);
    const seats = allocateSeats(system, res);
    for (const p of partyIds) {
      seatDraws[p].push(seats[p] ?? 0);
      shareDraws[p].push(res.voteShares[p] ?? 0);
    }
    const m = majorityParty(seats);
    if (m) majorityN[m] = (majorityN[m] ?? 0) + 1;
    else hungN += 1;
    const top = [...partyIds].sort((a, b) => (res.voteShares[b] ?? 0) - (res.voteShares[a] ?? 0))[0];
    if (top) winsN[top] = (winsN[top] ?? 0) + 1;
    n += 1;
  };
  const range = (xs: number[]): Range => {
    const s = [...xs].sort((a, b) => a - b);
    return { lo: quantile(s, 0.1), mid: quantile(s, 0.5), hi: quantile(s, 0.9) };
  };
  const frac = (o: Record<PartyId, number>) =>
    Object.fromEntries(Object.entries(o).map(([p, c]) => [p, c / n]));
  return {
    total,
    done: () => n,
    step(k) {
      const t0 = now();
      for (let i = 0; i < k && n < total; i++) one();
      ms += now() - t0;
      return n >= total;
    },
    result() {
      if (!n) return null;
      const seats: Record<PartyId, Range> = {};
      const shares: Record<PartyId, Range> = {};
      for (const p of partyIds) {
        seats[p] = range(seatDraws[p]);
        shares[p] = range(shareDraws[p]);
      }
      return { runs: n, seats, shares, majority: frac(majorityN), hung: hungN / n, wins: frac(winsN), ms };
    },
  };
}

/** All runs in one go (tests, scripts). */
export function simulateUncertainty(
  input: ModelInput,
  scenario: Scenario | null,
  opts: UncertaintyOptions = {},
): Uncertainty | null {
  const run = startUncertainty(input, scenario, opts);
  if (!run) return null;
  run.step(run.total);
  return run.result();
}

/** Groups in the scenario's slice whose poll sample is under SMALL_SAMPLE. */
export function smallGroups(gv: GroupVoting, scenario: Scenario | null): string[] {
  if (!scenario) return [];
  const d = gv[scenario.dimension];
  if (!d) return [];
  return Object.entries(d.groups)
    .filter(([, g]) => g.n !== undefined && g.n < SMALL_SAMPLE)
    .map(([id]) => id);
}
