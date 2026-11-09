/**
 * The record book: facts about the real general elections in our data, worked out straight from
 * the seat-by-seat votes (no modelling). Pure functions over ElectionEvent.
 */
import { allocateSeats, gallagher } from "./systems";
import type { ElectionEvent, PartyId, ScenarioResult } from "./types";

/** Lumped-together buckets that aren't one party, so they can't hold a record. */
const NOT_A_PARTY = new Set(["other", "ni", "ind", "spk"]);

export interface ElectionSummary {
  event: ElectionEvent;
  seatsTotal: number;
  seats: Record<PartyId, number>;
  votes: Record<PartyId, number>;
  voteShares: Record<PartyId, number>;
  totalVotes: number;
  turnout: number;
  /** Party with most seats, and whether it had a majority of all seats. */
  winner: PartyId;
  winnerSeats: number;
  /** Seats above everyone else combined (negative: short of a majority). */
  majority: number;
  /** Winner's seat share minus its vote share (0..1). */
  bonus: number;
  /** Gallagher least-squares index (0 = seats match votes exactly). */
  gap: number;
  /** Seats the winner would have under pure proportional representation. */
  prSeats: number;
}

export function summarise(event: ElectionEvent): ElectionSummary {
  const seats: Record<PartyId, number> = {};
  const votes: Record<PartyId, number> = {};
  let electorate = 0;
  for (const c of event.constituencies) {
    electorate += c.electorate;
    let best: PartyId | null = null;
    for (const [p, n] of Object.entries(c.votes)) {
      votes[p] = (votes[p] ?? 0) + n;
      if (best === null || n > c.votes[best]) best = p;
    }
    if (best) seats[best] = (seats[best] ?? 0) + 1;
  }
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  const voteShares = Object.fromEntries(Object.entries(votes).map(([p, n]) => [p, n / totalVotes]));
  const seatsTotal = event.constituencies.length;
  const [winner, winnerSeats] = Object.entries(seats)
    .filter(([p]) => !NOT_A_PARTY.has(p))
    .sort((a, b) => b[1] - a[1])[0];
  const pr = allocateSeats("pr", {
    voteShares,
    votes,
    totalVotes,
    seats,
    seatResults: event.constituencies,
  } as unknown as ScenarioResult);
  return {
    event,
    seatsTotal,
    seats,
    votes,
    voteShares,
    totalVotes,
    turnout: electorate ? totalVotes / electorate : 0,
    winner,
    winnerSeats,
    majority: 2 * winnerSeats - seatsTotal,
    bonus: winnerSeats / seatsTotal - (voteShares[winner] ?? 0),
    gap: gallagher(seats, voteShares),
    prSeats: pr[winner] ?? 0,
  };
}

export interface PartyCost {
  event: ElectionEvent;
  party: PartyId;
  votes: number;
  seats: number;
  /** Votes per MP elected (Infinity with no seats). */
  perSeat: number;
}

/** Votes per MP for every real party at every election (parties with 50,000+ votes). */
export function partyCosts(summaries: ElectionSummary[]): PartyCost[] {
  const out: PartyCost[] = [];
  for (const s of summaries)
    for (const [party, v] of Object.entries(s.votes)) {
      if (NOT_A_PARTY.has(party) || v < 50000) continue;
      const n = s.seats[party] ?? 0;
      out.push({ event: s.event, party, votes: v, seats: n, perSeat: n ? v / n : Infinity });
    }
  return out;
}

export interface SeatRecord {
  event: ElectionEvent;
  seat: string;
  region: string;
  winner: PartyId;
  second: PartyId | null;
  /** Winner's votes minus runner-up's. */
  majorityVotes: number;
  /** Same, as a share of votes cast. */
  majorityShare: number;
  /** Winner's share of the vote. */
  winnerShare: number;
}

/**
 * Every seat result where both of the top two are real parties. Seats where a lumped "Others"
 * or "Northern Ireland parties" bucket is in the top two are left out, because we can't tell
 * which candidate those votes belonged to.
 */
export function seatRecords(events: ElectionEvent[]): SeatRecord[] {
  const out: SeatRecord[] = [];
  for (const e of events) {
    const lumped = e.parties.some((p) => p.id === "ni");
    for (const c of e.constituencies) {
      const ranked = Object.entries(c.votes).sort((a, b) => b[1] - a[1]);
      const total = ranked.reduce((a, [, n]) => a + n, 0);
      if (!ranked.length || !total) continue;
      const [w, s] = ranked;
      if (lumped && (NOT_A_PARTY.has(w[0]) || (s && NOT_A_PARTY.has(s[0])))) continue;
      if (w[0] === "spk") continue;
      out.push({
        event: e,
        seat: c.name,
        region: c.region,
        winner: w[0],
        second: s?.[0] ?? null,
        majorityVotes: w[1] - (s?.[1] ?? 0),
        majorityShare: (w[1] - (s?.[1] ?? 0)) / total,
        winnerShare: w[1] / total,
      });
    }
  }
  return out;
}

export const partyName = (e: ElectionEvent, id: PartyId) => e.parties.find((p) => p.id === id)?.name ?? id;
export const partyColour = (e: ElectionEvent, id: PartyId) => e.parties.find((p) => p.id === id)?.colour ?? "#999";
