/**
 * How close the final polls came. Pure functions over src/data/final-polls.json.
 * All figures in percentage points.
 */
import finalPollsJson from "../data/final-polls.json";

export interface FinalPoll {
  end: string;
  pollster: string;
  client: string | null;
  sample: number | null;
  /** Party/option -> share as printed (percent). "und" = undecided, for referendums. */
  shares: Record<string, number>;
}

export interface VotePolls {
  eventId: string;
  label: string;
  short: string;
  date: string;
  kind: "general" | "referendum";
  url: string;
  /** The parties (or options) the polls report, which are the ones we compare. */
  parties: string[];
  /** Real result, percent (GB only for general elections). */
  result: Record<string, number>;
  polls: FinalPoll[];
}

/** Parties below this share (percent) are shown but left out of the average miss. */
export const BIG_PARTY = 5;

export const finalPolls = finalPollsJson as unknown as VotePolls[];

/** A poll's shares on the same footing as the result: referendum polls without the undecideds. */
export function comparable(v: VotePolls, p: FinalPoll): Record<string, number> {
  if (v.kind !== "referendum") return p.shares;
  const sum = v.parties.reduce((a, k) => a + (p.shares[k] ?? 0), 0) || 1;
  return Object.fromEntries(v.parties.map((k) => [k, (100 * (p.shares[k] ?? 0)) / sum]));
}

/** The two parties (or options) that came first and second in the real result. */
export function topTwo(v: VotePolls): [string, string] {
  const [a, b] = [...v.parties].sort((x, y) => v.result[y] - v.result[x]);
  return [a, b];
}

export interface PollScore {
  poll: FinalPoll;
  /** Average miss across the compared parties on 5% or more, in points. */
  meanError: number;
  /** Poll lead of the real winner over the real runner-up, minus the real lead. Negative = understated. */
  leadError: number;
  /** Did it put the real winner ahead (ties count as no)? */
  calledIt: boolean;
  /** Per-party miss: poll minus result. */
  errors: Record<string, number>;
}

export function scorePoll(v: VotePolls, p: FinalPoll): PollScore {
  const s = comparable(v, p);
  const parties = v.parties.filter((k) => s[k] !== undefined);
  const errors = Object.fromEntries(parties.map((k) => [k, s[k] - v.result[k]]));
  // Only parties on 5% or more, so years with lots of tiny parties don't look better than they were.
  const big = parties.filter((k) => v.result[k] >= BIG_PARTY);
  const meanError = big.reduce((a, k) => a + Math.abs(errors[k]), 0) / (big.length || 1);
  const [w, r] = topTwo(v);
  const lead = (s[w] ?? 0) - (s[r] ?? 0);
  return { poll: p, meanError, leadError: lead - (v.result[w] - v.result[r]), calledIt: lead > 0, errors };
}

export interface VoteScore {
  vote: VotePolls;
  scores: PollScore[];
  /** Average of the final polls' mean errors. */
  meanError: number;
  /** Average lead error (signed). */
  leadError: number;
  /** The final polls' average share for each party, against the result. */
  average: Record<string, number>;
  called: number;
}

export function scoreVote(v: VotePolls): VoteScore {
  const scores = v.polls.map((p) => scorePoll(v, p)).sort((a, b) => a.meanError - b.meanError);
  const n = scores.length || 1;
  const average = Object.fromEntries(
    v.parties.map((k) => {
      const xs = v.polls.map((p) => comparable(v, p)[k]).filter((x) => x !== undefined);
      return [k, xs.reduce((a, b) => a + b, 0) / (xs.length || 1)];
    }),
  );
  return {
    vote: v,
    scores,
    meanError: scores.reduce((a, s) => a + s.meanError, 0) / n,
    leadError: scores.reduce((a, s) => a + s.leadError, 0) / n,
    average,
    called: scores.filter((s) => s.calledIt).length,
  };
}

/** Pollster names that changed over the years, so the league table joins them up. */
const SAME_FIRM: Record<string, string> = { "Ipsos MORI": "Ipsos (MORI)", MORI: "Ipsos (MORI)", Ipsos: "Ipsos (MORI)" };

export interface PollsterRecord {
  pollster: string;
  votes: number;
  meanError: number;
  called: number;
}

/** Each polling company's average miss across every vote it polled. */
export function pollsterTable(votes: VoteScore[], minVotes = 3): PollsterRecord[] {
  const by = new Map<string, { votes: Set<string>; errs: number[]; called: number }>();
  for (const v of votes)
    for (const s of v.scores) {
      const name = SAME_FIRM[s.poll.pollster] ?? s.poll.pollster;
      const r = by.get(name) ?? { votes: new Set(), errs: [], called: 0 };
      r.votes.add(v.vote.eventId);
      r.errs.push(s.meanError);
      if (s.calledIt) r.called++;
      by.set(name, r);
    }
  return [...by.entries()]
    .filter(([, r]) => r.votes.size >= minVotes)
    .map(([pollster, r]) => ({
      pollster,
      votes: r.votes.size,
      meanError: r.errs.reduce((a, b) => a + b, 0) / r.errs.length,
      called: r.called,
    }))
    .sort((a, b) => a.meanError - b.meanError);
}
