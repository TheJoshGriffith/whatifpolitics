/**
 * "Pub quiz": a random what-if. Picks a vote, a slice, a mode and some groups, and now and
 * then a second slice or a turnout dial. Pure, with an injectable random number generator
 * so tests can pin it down.
 */
import { maxTurnoutFactor } from "./engine";
import type { ElectionEvent, GroupId, Scenario } from "./types";

export type Rng = () => number;

const pick = <T>(xs: T[], rng: Rng): T => xs[Math.floor(rng() * xs.length) % xs.length];

/** A random non-empty, not-everyone subset of the ids. */
function subset(ids: GroupId[], rng: Rng): GroupId[] {
  if (ids.length < 2) return [...ids];
  const k = 1 + Math.floor(rng() * Math.min(ids.length - 1, 3));
  const pool = [...ids];
  const out: GroupId[] = [];
  while (out.length < k) out.push(pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0]);
  return ids.filter((g) => out.includes(g));
}

/** Poll people behind a set of groups (Infinity when the polls don't say). */
function sampleOf(event: ElectionEvent, dim: string, groups: GroupId[]): number {
  let n = 0;
  for (const g of groups) {
    const x = event.groupVoting[dim]?.groups[g]?.n;
    if (typeof x !== "number") return Infinity;
    n += x;
  }
  return n;
}

/** The smallest poll sample we'll let an "only these people vote" pick rest on. */
export const MIN_SAMPLE = 200;

export function randomScenario(event: ElectionEvent, rng: Rng = Math.random): Scenario {
  for (let tries = 0; tries < 50; tries++) {
    const dim = pick(event.dimensions, rng);
    const ids = dim.groups.map((g) => g.id);
    const roll = rng();
    if (roll < 0.2) {
      // One turnout dial, somewhere between "stayed home" and the most the dial allows.
      const g = pick(ids, rng);
      const max = maxTurnoutFactor(event.groupVoting[dim.id]?.groups[g]?.turnout);
      const steps = Math.round(max * 10);
      let f = Math.round(rng() * steps) / 10;
      if (f === 1) f = rng() < 0.5 ? 0 : max;
      return { dimension: dim.id, mode: "turnout", groups: [], turnout: { [g]: f } };
    }
    const mode = rng() < 0.5 ? "only" : "exclude";
    const groups = subset(ids, rng);
    const s: Scenario = { dimension: dim.id, mode, groups };
    if (rng() < 0.25) {
      // Skip slices that overlap this one ("age × sex" already knows your age and sex).
      const others = event.dimensions.filter((d) => !d.id.includes(dim.id) && !dim.id.includes(d.id));
      if (others.length) {
        const d2 = pick(others, rng);
        s.and = { dimension: d2.id, groups: subset(d2.groups.map((g) => g.id), rng) };
      }
    }
    // Don't build a whole election out of a handful of poll respondents.
    if (mode === "only" && !s.and && sampleOf(event, dim.id, groups) < MIN_SAMPLE) continue;
    return s;
  }
  const dim = event.dimensions[0];
  return { dimension: dim.id, mode: "exclude", groups: [dim.groups[0].id] };
}

/** A random vote, then a random what-if in it. */
export function randomPick(events: ElectionEvent[], rng: Rng = Math.random): { event: ElectionEvent; scenario: Scenario } {
  const event = pick(events, rng);
  return { event, scenario: randomScenario(event, rng) };
}
