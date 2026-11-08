/**
 * Other voting systems and who'd form a government.
 *
 * Seats under FPTP come straight from the engine. The PR systems re-share the same votes:
 * the scenario decides who votes and how; the system decides how votes become seats.
 */
import type { Party, PartyId, ScenarioResult } from "./types";

export type VotingSystem = "fptp" | "pr" | "pr5" | "regional";

export const systems: { id: VotingSystem; label: string; short: string; blurb: string }[] = [
  {
    id: "fptp",
    label: "First past the post",
    short: "FPTP",
    blurb: "What we actually use. Win the most votes in a seat and you win it; everyone else gets nothing.",
  },
  {
    id: "pr",
    label: "Pure proportional",
    short: "Pure PR",
    blurb: "All 650 seats shared out by national vote share (Sainte-Laguë). 10% of the votes gets you about 10% of the seats.",
  },
  {
    id: "pr5",
    label: "PR with a 5% hurdle",
    short: "PR, 5% bar",
    blurb: "Like Germany: parties need 5% of the national vote to get any seats, then seats are shared by vote share (D'Hondt).",
  },
  {
    id: "regional",
    label: "Regional lists",
    short: "Regional lists",
    blurb: "How Britain elected MEPs until 2019: each region keeps its number of seats and shares them by its own vote (D'Hondt).",
  },
];

/** Votes for these aren't a real list party under PR, so they're wasted. */
const NOT_A_LIST = new Set(["other", "ind", "spk"]);

/** Highest-averages seat allocation. divisor(n) is the divisor for a party that already has n seats. */
function highestAverages(votes: Record<PartyId, number>, seats: number, divisor: (n: number) => number) {
  const out: Record<PartyId, number> = {};
  const ids = Object.keys(votes).filter((p) => votes[p] > 0);
  for (const p of ids) out[p] = 0;
  for (let i = 0; i < seats && ids.length; i++) {
    let best = ids[0];
    let bestQ = -1;
    for (const p of ids) {
      const q = votes[p] / divisor(out[p]);
      if (q > bestQ) {
        bestQ = q;
        best = p;
      }
    }
    out[best] += 1;
  }
  return out;
}
const dHondt = (n: number) => n + 1;
const sainteLague = (n: number) => 2 * n + 1;

function listVotes(votes: Record<PartyId, number>) {
  const v: Record<PartyId, number> = {};
  for (const [p, n] of Object.entries(votes)) if (!NOT_A_LIST.has(p)) v[p] = n;
  return v;
}

/** Seats per party under a voting system, for a scenario result. */
export function allocateSeats(system: VotingSystem, result: ScenarioResult): Record<PartyId, number> {
  const out: Record<PartyId, number> = {};
  for (const p of Object.keys(result.seats)) out[p] = 0;
  for (const [p, n] of Object.entries(allocate(system, result))) out[p] = n;
  return out;
}

function allocate(system: VotingSystem, result: ScenarioResult): Record<PartyId, number> {
  const total = result.seatResults.length;
  if (system === "fptp") return result.seats;
  if (system === "pr") return highestAverages(listVotes(result.votes), total, sainteLague);
  if (system === "pr5") {
    const v = listVotes(result.votes);
    const sum = result.totalVotes || 1;
    for (const p of Object.keys(v)) if (v[p] / sum < 0.05) delete v[p];
    return highestAverages(v, total, dHondt);
  }
  // regional lists
  const regions = new Map<string, { seats: number; votes: Record<PartyId, number> }>();
  for (const s of result.seatResults) {
    const r = regions.get(s.region) ?? { seats: 0, votes: {} };
    r.seats += 1;
    for (const [p, n] of Object.entries(s.votes)) r.votes[p] = (r.votes[p] ?? 0) + n;
    regions.set(s.region, r);
  }
  const out: Record<PartyId, number> = {};
  for (const r of regions.values()) {
    for (const [p, n] of Object.entries(highestAverages(listVotes(r.votes), r.seats, dHondt))) out[p] = (out[p] ?? 0) + n;
  }
  return out;
}

export interface RegionAllocation {
  region: string;
  /** Seats the region elects (its number of constituencies). */
  total: number;
  seats: Record<PartyId, number>;
}

/** Seats per party in each region under regional lists (D'Hondt per region). */
export function regionalAllocation(result: ScenarioResult): RegionAllocation[] {
  const regions = new Map<string, { seats: number; votes: Record<PartyId, number> }>();
  for (const s of result.seatResults) {
    const r = regions.get(s.region) ?? { seats: 0, votes: {} };
    r.seats += 1;
    for (const [p, n] of Object.entries(s.votes)) r.votes[p] = (r.votes[p] ?? 0) + n;
    regions.set(s.region, r);
  }
  return [...regions].map(([region, r]) => ({
    region,
    total: r.seats,
    seats: highestAverages(listVotes(r.votes), r.seats, dHondt),
  }));
}

/** Gallagher index: 0 = perfectly proportional. Typical FPTP UK result is 15–25. */
export function gallagher(seats: Record<PartyId, number>, voteShares: Record<PartyId, number>): number {
  const total = Object.values(seats).reduce((a, b) => a + b, 0) || 1;
  const ids = new Set([...Object.keys(seats), ...Object.keys(voteShares)]);
  let sum = 0;
  for (const p of ids) {
    const d = 100 * ((voteShares[p] ?? 0) - (seats[p] ?? 0) / total);
    sum += d * d;
  }
  return Math.sqrt(sum / 2);
}

// ---------------------------------------------------------------------------------------------
// Who governs?
// ---------------------------------------------------------------------------------------------

/**
 * How willing two parties are to put each other in government (coalition or confidence-and-supply),
 * from 0 (never) to 1 (they'd sign tomorrow). Our own judgement, based on what parties said and did
 * at the time; see the How it works page. Pairs not listed default to 0.1.
 */
const BASE: Record<string, number> = {
  "con-ld": 0.45, "con-dup": 0.8, "con-uup": 0.75, "con-tuv": 0.35, "con-apni": 0.15,
  "con-reform": 0.3, "con-brexit": 0.4, "con-ukip": 0.2,
  "con-lab": 0.003, "con-snp": 0.02, "con-pc": 0.03, "con-green": 0.03, "con-sdlp": 0.05,
  "lab-ld": 0.55, "lab-snp": 0.3, "lab-pc": 0.5, "lab-green": 0.6, "lab-sdlp": 0.8, "lab-apni": 0.5,
  "lab-dup": 0.1, "lab-uup": 0.15, "lab-reform": 0.01, "lab-brexit": 0.01, "lab-ukip": 0.01, "lab-tuv": 0.02,
  "ld-snp": 0.2, "ld-pc": 0.4, "ld-green": 0.6, "ld-sdlp": 0.6, "ld-apni": 0.8, "ld-dup": 0.05, "ld-uup": 0.25,
  "ld-reform": 0.02, "ld-brexit": 0.02, "ld-ukip": 0.02,
  "snp-pc": 0.8, "snp-green": 0.7, "snp-sdlp": 0.5, "snp-apni": 0.4, "snp-dup": 0.02, "snp-uup": 0.02,
  "pc-green": 0.7, "pc-sdlp": 0.5, "pc-apni": 0.4, "green-sdlp": 0.5, "green-apni": 0.5, "sdlp-apni": 0.7,
  "dup-uup": 0.7, "dup-tuv": 0.5, "uup-apni": 0.3, "uup-tuv": 0.3,
  "reform-dup": 0.4, "reform-tuv": 0.5, "reform-uup": 0.2, "brexit-dup": 0.4, "ukip-dup": 0.3,
};

/** What changed in particular elections. */
const ERA: Record<string, Record<string, number>> = {
  ge2010: { "con-ld": 0.65, "lab-ld": 0.45, "lab-snp": 0.3, "con-dup": 0.6 },
  // Miliband ruled out any deal with the SNP; Lib Dems bruised after five years with the Tories.
  ge2015: { "lab-snp": 0.1, "con-ld": 0.4, "lab-ld": 0.45, "con-ukip": 0.2 },
  // May's confidence-and-supply deal with the DUP; Lib Dems said no coalition with anyone.
  ge2017: { "con-dup": 0.9, "con-ld": 0.1, "lab-ld": 0.25, "lab-snp": 0.35 },
  // Swinson ruled out putting Johnson or Corbyn in No 10; the Brexit Party stood down in Tory seats.
  ge2019: { "con-ld": 0.05, "lab-ld": 0.15, "lab-snp": 0.4, "con-brexit": 0.5, "con-dup": 0.5 },
  // Labour ruled out deals with the SNP; Badenoch-era Tories and Reform circling each other.
  ge2024: { "lab-snp": 0.15, "con-ld": 0.15, "lab-ld": 0.45, "con-reform": 0.3 },
};

/** Parties who don't take their seats, or don't vote. */
const NON_VOTING = new Set(["sf", "spk"]);
/** Too small and too varied to be a coalition partner as a bloc. */
const NOT_A_PARTNER = new Set(["other", "ind", "bnp"]);

/** User tweaks to the willingness matrix, keyed "a-b" (either order). */
export type WillingnessOverrides = Record<string, number>;

export function willingness(eventId: string, a: PartyId, b: PartyId, overrides?: WillingnessOverrides): number {
  if (a === b) return 1;
  const k1 = `${a}-${b}`;
  const k2 = `${b}-${a}`;
  const o = overrides?.[k1] ?? overrides?.[k2];
  if (o !== undefined) return Math.min(1, Math.max(0, o));
  if (a === "bnp" || b === "bnp") return 0;
  const era = ERA[eventId] ?? {};
  return era[k1] ?? era[k2] ?? BASE[k1] ?? BASE[k2] ?? 0.1;
}

/** Pairs of parties (biggest first) whose willingness matters for these seats, for the tweak panel. */
export function coalitionPairs(
  eventId: string,
  seats: Record<PartyId, number>,
  maxParties = 6,
): { key: string; a: PartyId; b: PartyId; base: number }[] {
  const players = Object.entries(seats)
    .filter(([p, n]) => n > 0 && !NON_VOTING.has(p) && !NOT_A_PARTNER.has(p))
    .sort((x, y) => y[1] - x[1])
    .slice(0, maxParties)
    .map(([p]) => p);
  const out: { key: string; a: PartyId; b: PartyId; base: number }[] = [];
  for (let i = 0; i < players.length; i++)
    for (let j = i + 1; j < players.length; j++) {
      const [a, b] = [players[i], players[j]];
      out.push({ key: `${a}-${b}`, a, b, base: willingness(eventId, a, b) });
    }
  return out;
}

export interface Deal {
  /** First party is the one that gets No 10 (the biggest in the deal). */
  parties: PartyId[];
  seats: number;
  /** Minority government relying on others not voting it down. */
  minority: boolean;
  chance: number;
}

export interface Formation {
  /** Seats needed to win votes, once Sinn Féin and the Speaker are taken out. */
  workingMajority: number;
  votingSeats: number;
  majorityParty: PartyId | null;
  deals: Deal[];
  /** Chance each party ends up with the PM. */
  pmChance: Record<PartyId, number>;
}

/**
 * Enumerate every winning combination of up to four parties where nobody is a passenger
 * (drop any member and it no longer adds up), plus minority governments for parties close
 * to the line. Score each by how willing the members are and how many of them there are,
 * then turn scores into chances.
 */
export function formGovernment(
  eventId: string,
  seats: Record<PartyId, number>,
  overrides?: WillingnessOverrides,
): Formation {
  const voting = Object.entries(seats).filter(([p, n]) => n > 0 && !NON_VOTING.has(p));
  const votingSeats = voting.reduce((a, [, n]) => a + n, 0);
  const need = Math.floor(votingSeats / 2) + 1;
  const big = voting.sort((a, b) => b[1] - a[1]);
  if (big.length && big[0][1] >= need) {
    return {
      workingMajority: need,
      votingSeats,
      majorityParty: big[0][0],
      deals: [{ parties: [big[0][0]], seats: big[0][1], minority: false, chance: 1 }],
      pmChance: { [big[0][0]]: 1 },
    };
  }
  const players = big.filter(([p]) => !NOT_A_PARTNER.has(p)).slice(0, 14);
  const raw: Omit<Deal, "chance">[] = [];
  const scores: number[] = [];
  const n = players.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const members: [PartyId, number][] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) members.push(players[i]);
    if (members.length > 4) continue;
    const total = members.reduce((a, [, s]) => a + s, 0);
    if (total < need) continue;
    if (members.some(([, s]) => total - s >= need)) continue; // someone's a passenger
    const leader = members[0][0];
    let w = 1;
    for (let i = 1; i < members.length; i++) {
      w *= willingness(eventId, leader, members[i][0], overrides);
      for (let j = 1; j < i; j++) w *= Math.sqrt(willingness(eventId, members[i][0], members[j][0], overrides));
    }
    // Squared so that "barely willing" deals stay fringe rather than eating a few % each.
    const score = w * w * Math.pow(0.6, members.length - 1);
    if (score < 1e-4) continue;
    raw.push({ parties: members.map(([p]) => p), seats: total, minority: false });
    scores.push(score);
  }
  // Minority governments: plausible when you're close and the rest can't easily unite.
  for (const [p, s] of players.slice(0, 3)) {
    const closeness = Math.max(0, (s / need - 0.8) / 0.2);
    const score = 0.35 * closeness * closeness;
    if (score > 1e-4) {
      raw.push({ parties: [p], seats: s, minority: true });
      scores.push(score);
    }
  }
  const sum = scores.reduce((a, b) => a + b, 0) || 1;
  const deals = raw
    .map((d, i) => ({ ...d, chance: scores[i] / sum }))
    .sort((a, b) => b.chance - a.chance);
  const pmChance: Record<PartyId, number> = {};
  for (const d of deals) pmChance[d.parties[0]] = (pmChance[d.parties[0]] ?? 0) + d.chance;
  return { workingMajority: need, votingSeats, majorityParty: null, deals, pmChance };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function governmentHeadline(
  f: Formation,
  seats: Record<PartyId, number>,
  voteShares: Record<PartyId, number>,
  parties: Party[],
  system: VotingSystem,
): string {
  const name = (id: PartyId) => parties.find((p) => p.id === id)?.name ?? id;
  const total = Object.values(seats).reduce((a, b) => a + b, 0) || 1;
  if (f.majorityParty) {
    const p = f.majorityParty;
    const seatShare = (seats[p] ?? 0) / total;
    const vs = voteShares[p] ?? 0;
    if (vs < 0.5 && seatShare - vs > 0.08)
      return `${name(p)} win ${pct(seatShare)} of the seats on ${pct(vs)} of the vote. First past the post, everybody!`;
    if (seatShare >= 0.6) return `A whopping ${name(p)} landslide, on ${pct(vs)} of the vote. Somebody fetch the bunting.`;
    return `${name(p)} win outright with ${pct(vs)} of the vote. Kettle on.`;
  }
  if (!f.deals.length) return "Nobody voted. The returning officer has gone home early.";
  const top = Object.entries(f.pmChance).sort((a, b) => b[1] - a[1])[0];
  const best = f.deals[0];
  const shape =
    best.parties.length === 1
      ? `${name(best.parties[0])} going it alone as a minority government`
      : best.parties.map(name).join(" + ");
  const opener = system === "fptp" ? "Hung parliament!" : "Nobody gets a majority, which is normal under PR.";
  const odds = top[1] >= 0.98 ? `${name(top[0])} are nailed on for No 10` : `${name(top[0])} have a ${pct(top[1])} shot at No 10`;
  return `${opener} ${odds}. Likeliest outcome: ${shape}.`;
}
