import { describe, expect, it } from "vitest";
import {
  buildModel,
  estimateSeatGroupVotes,
  governmentOutcome,
  keptGroups,
  majorityNeeded,
  rake,
  runScenario,
  type ModelInput,
} from "./engine";
import type { Constituency, Dimension, GroupVoting, Party } from "./types";
import { modelInput } from "./data";
import { presets } from "./presets";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("rake (IPF)", () => {
  it("matches column targets exactly and row targets closely", () => {
    const seed = [
      [10, 20, 5],
      [30, 10, 10],
    ];
    const rows = [600, 400];
    const cols = [500, 300, 200];
    const m = rake(seed, rows, cols, 50);
    cols.forEach((c, j) => expect(m[0][j] + m[1][j]).toBeCloseTo(c, 6));
    rows.forEach((r, i) => expect(sum(m[i])).toBeCloseTo(r, 3));
  });

  it("gives zero to a party with zero target votes", () => {
    const m = rake([[1, 1], [1, 1]], [5, 5], [10, 0]);
    expect(m[0][1]).toBe(0);
    expect(m[1][1]).toBe(0);
    expect(m[0][0] + m[1][0]).toBeCloseTo(10);
  });

  it("lets a party with no seed support still collect its target", () => {
    const m = rake([[1, 0], [1, 0]], [5, 5], [6, 4]);
    expect(m[0][1] + m[1][1]).toBeCloseTo(4);
  });
});

// ---- tiny two-party, two-group world ----
const parties: Party[] = [
  { id: "a", name: "Apple Party", short: "A", colour: "#f00" },
  { id: "b", name: "Banana Party", short: "B", colour: "#ff0" },
];
const dim: Dimension = {
  id: "age",
  label: "Age",
  groups: [
    { id: "young", label: "Young", emoji: "🛹" },
    { id: "old", label: "Old", emoji: "🫖" },
  ],
};
const groupVoting = {
  age: {
    source: "test",
    groups: {
      young: { voterShare: 0.4, turnout: 0.5, shares: { a: 0.8, b: 0.2 } },
      old: { voterShare: 0.6, turnout: 0.8, shares: { a: 0.3, b: 0.7 } },
    },
  },
} as unknown as GroupVoting;
const seat = (id: string, a: number, b: number): Constituency =>
  ({
    id,
    name: id,
    region: "Testshire",
    electorate: 1000,
    votes: { a, b },
    groupShares: { age: { young: 0.5, old: 0.5 } },
  }) as unknown as Constituency;

const world: ModelInput = {
  parties,
  dimensions: [dim],
  groupVoting,
  // b narrowly wins seats 1 & 2 on the back of old voters; a wins 3 comfortably
  constituencies: [seat("s1", 300, 350), seat("s2", 310, 340), seat("s3", 500, 150)],
};

describe("estimateSeatGroupVotes", () => {
  it("reproduces actual party votes and keeps group totals ∝ share × turnout", () => {
    const est = estimateSeatGroupVotes(world.constituencies[0], dim, groupVoting, ["a", "b"]);
    expect(est.young.a + est.old.a).toBeCloseTo(300, 6);
    expect(est.young.b + est.old.b).toBeCloseTo(350, 6);
    const young = est.young.a + est.young.b;
    const old = est.old.a + est.old.b;
    // 0.5*0.5 : 0.5*0.8 = 0.25 : 0.40
    expect(young / old).toBeCloseTo(0.25 / 0.4, 2);
    // young lean to a, old to b
    expect(est.young.a / young).toBeGreaterThan(est.old.a / old);
  });

  it("falls back to the national voter mix when a seat has no census shares", () => {
    const bare = { ...world.constituencies[0], groupShares: undefined };
    const est = estimateSeatGroupVotes(bare, dim, groupVoting, ["a", "b"]);
    const young = est.young.a + est.young.b;
    const old = est.old.a + est.old.b;
    expect(young / old).toBeCloseTo(0.4 / 0.6, 2);
    expect(est.young.a + est.old.a).toBeCloseTo(300, 6);
  });
});

describe("scenarios", () => {
  const model = buildModel(world);

  it("baseline is plain FPTP on actual votes", () => {
    expect(model.baseline.seats).toEqual({ a: 1, b: 2 });
    expect(model.baseline.flipped).toHaveLength(0);
  });

  it("keptGroups handles exclude and only", () => {
    expect(keptGroups({ dimension: "age", mode: "exclude", groups: ["old"] }, ["young", "old"])).toEqual(["young"]);
    expect(keptGroups({ dimension: "age", mode: "only", groups: ["old"] }, ["young", "old"])).toEqual(["old"]);
  });

  it("excluding old voters flips the b seats to a", () => {
    const r = runScenario(model, { dimension: "age", mode: "exclude", groups: ["old"] });
    expect(r.seats).toEqual({ a: 3, b: 0 });
    expect(r.flipped.map((f) => [f.id, f.from, f.to])).toEqual(
      expect.arrayContaining([
        ["s1", "b", "a"],
        ["s2", "b", "a"],
      ]),
    );
    // most surprising (biggest original margin) first
    expect(r.flipped[0].originalMargin).toBeGreaterThanOrEqual(r.flipped[1].originalMargin);
    expect(r.government.hasMajority).toBe(true);
  });

  it("'only' is the complement of 'exclude' — votes add back up to the total", () => {
    const ex = runScenario(model, { dimension: "age", mode: "exclude", groups: ["old"] });
    const only = runScenario(model, { dimension: "age", mode: "only", groups: ["old"] });
    expect(ex.totalVotes + only.totalVotes).toBeCloseTo(model.baseline.totalVotes, 4);
  });

  it("excluding nobody reproduces the baseline", () => {
    const r = runScenario(model, { dimension: "age", mode: "exclude", groups: [] });
    expect(r.seats).toEqual(model.baseline.seats);
    expect(r.flipped).toHaveLength(0);
  });

  it("excluding everybody returns no winners and a cheeky headline", () => {
    const r = runScenario(model, { dimension: "age", mode: "exclude", groups: ["young", "old"] });
    expect(r.totalVotes).toBe(0);
    expect(r.government.largestParty).toBeNull();
    expect(r.headline).toMatch(/Nobody voted/);
  });
});

describe("government outcome", () => {
  it("needs 326 of 650", () => {
    expect(majorityNeeded(650)).toBe(326);
  });

  it("detects a hung parliament and suggests a deal", () => {
    const g = governmentOutcome({ a: 300, b: 250, c: 100 }, 650, ["a", "b", "c"]);
    expect(g.hasMajority).toBe(false);
    expect(g.possibleDeal).toEqual(["a", "b"]);
  });

  it("computes the Commons-style majority", () => {
    const g = governmentOutcome({ a: 411, b: 239 }, 650, ["a", "b"]);
    expect(g.hasMajority).toBe(true);
    expect(g.majority).toBe(172);
  });
});

describe("real data sanity", () => {
  const model = buildModel(modelInput);
  it("national voter shares sum to 1 in every dimension", () => {
    for (const d of modelInput.dimensions)
      expect(sum(d.groups.map((g) => modelInput.groupVoting[d.id].groups[g.id].voterShare))).toBeCloseTo(1, 3);
  });
  it("any seat-level census shares sum to 1", () => {
    for (const c of modelInput.constituencies)
      for (const d of modelInput.dimensions) {
        const s = c.groupShares?.[d.id];
        if (s) expect(sum(Object.values(s))).toBeCloseTo(1, 3);
      }
  });
  it("baseline reproduces the real 2024 result", () => {
    expect(modelInput.constituencies).toHaveLength(650);
    expect(model.baseline.seats).toMatchObject({ lab: 411, con: 121, ld: 72, snp: 9, sf: 7, ind: 6, reform: 5, dup: 5, green: 4, pc: 4 });
    expect(model.baseline.totalVotes).toBe(28809340);
  });
  it("every preset runs and references real groups", () => {
    for (const p of presets) {
      const dim = modelInput.dimensions.find((d) => d.id === p.scenario.dimension)!;
      for (const g of p.scenario.groups) expect(dim.groups.map((x) => x.id)).toContain(g);
      const r = runScenario(model, p.scenario);
      expect(sum(Object.values(r.seats))).toBe(modelInput.constituencies.length);
    }
  });
});
