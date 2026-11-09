import { describe, expect, it } from "vitest";
import {
  buildModel,
  estimateSeatGroupVotes,
  governmentOutcome,
  isNoOp,
  keptGroups,
  MAX_TURNOUT_FACTOR,
  scenarioFactors,
  majorityNeeded,
  rake,
  runScenario,
  type ModelInput,
} from "./engine";
import type { Constituency, Dimension, GroupVoting, Party } from "./types";
import { events, modelInput, modelInputFor } from "./data";
import { presets, presetsFor } from "./presets";

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
    groupShares: { age: { young: 0.3, old: 0.7 } },
  }) as unknown as Constituency;

const world: ModelInput = {
  parties,
  dimensions: [dim],
  groupVoting,
  // b narrowly wins seats 1 & 2 on the back of old voters; a wins 3 comfortably
  constituencies: [seat("s1", 300, 350), seat("s2", 310, 340), seat("s3", 500, 150)],
};

describe("estimateSeatGroupVotes", () => {
  it("reproduces actual party votes and uses the seat's own voter mix", () => {
    const est = estimateSeatGroupVotes(world.constituencies[0], dim, groupVoting, ["a", "b"]);
    expect(est.young.a + est.old.a).toBeCloseTo(300, 6);
    expect(est.young.b + est.old.b).toBeCloseTo(350, 6);
    const young = est.young.a + est.young.b;
    const old = est.old.a + est.old.b;
    // seat voter mix is 30:70
    expect(young / old).toBeCloseTo(0.3 / 0.7, 2);
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

  it("uses a seat's own group party shares when it has an override", () => {
    // Nationally young lean to a; in this seat the override says young lean to b.
    const flipped = {
      ...world.constituencies[0],
      groupVotingOverride: { age: { young: { a: 0.2, b: 0.8 }, old: { a: 0.7, b: 0.3 } } },
    };
    const est = estimateSeatGroupVotes(flipped, dim, groupVoting, ["a", "b"]);
    const young = est.young.a + est.young.b;
    const old = est.old.a + est.old.b;
    expect(est.young.a + est.old.a).toBeCloseTo(300, 6);
    expect(est.young.b + est.old.b).toBeCloseTo(350, 6);
    expect(young / old).toBeCloseTo(0.3 / 0.7, 2);
    expect(est.young.b / young).toBeGreaterThan(est.old.b / old);
  });

  it("falls back to national shares for dimensions and groups the override leaves out", () => {
    const partial = { ...world.constituencies[0], groupVotingOverride: { sex: { women: { a: 1 } } } };
    const a = estimateSeatGroupVotes(partial, dim, groupVoting, ["a", "b"]);
    const b = estimateSeatGroupVotes(world.constituencies[0], dim, groupVoting, ["a", "b"]);
    expect(a).toEqual(b);
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
  it("every preset fits at least one event, and each event's presets run", () => {
    for (const p of presets) expect(events.some((e) => presetsFor(e).some((x) => x.id === p.id) || presetsFor(e).some((x) => x.label === p.label))).toBe(true);
    for (const e of events) {
      const m = buildModel(modelInputFor(e));
      expect(m.baseline.totalVotes).toBeGreaterThan(0);
      for (const p of presetsFor(e)) {
        const r = runScenario(m, p.scenario);
        expect(sum(Object.values(r.seats))).toBe(e.constituencies.length);
      }
    }
  }, 30000); // every event x every preset: slow on a busy machine
});

describe("Northern Ireland", () => {
  it("NI seats carry their own group behaviour, and dropping a group changes NI votes unevenly", () => {
    // 2005 has no NI survey data or Census mix, so it keeps GB behaviour.
    for (const e of events.filter((x) => x.kind === "general" && x.year >= 2010)) {
      const ni = e.constituencies.filter((c) => c.region === "Northern Ireland");
      expect(ni).toHaveLength(18);
      for (const c of ni) {
        expect(c.groupVotingOverride?.age).toBeDefined();
        expect(c.groupVotingOverride?.sex).toBeDefined();
        expect(c.groupShares?.age).toBeDefined();
      }
      const m = buildModel(modelInputFor(e));
      const r = runScenario(m, { dimension: "age", mode: "exclude", groups: [e.dimensions.find((d) => d.id === "age")!.groups.at(-1)!.id] });
      // With GB behaviour every NI party lost the same share; with NI behaviour they don't.
      const before = m.baseline.seatResults.filter((s) => s.region === "Northern Ireland");
      const after = r.seatResults.filter((s) => s.region === "Northern Ireland");
      const ratios = after.flatMap((s, i) =>
        ["dup", "sf", "apni"].filter((p) => (before[i].votes[p] ?? 0) > 0).map((p) => s.votes[p] / before[i].votes[p]),
      );
      expect(Math.max(...ratios) - Math.min(...ratios)).toBeGreaterThan(0.02);
    }
  });
});

describe("referendums", () => {
  it("counting areas have a local Census voter mix, except Gibraltar", async () => {
    const { getEvent } = await import("./data");
    const eu = getEvent("eu2016");
    expect(eu.constituencies.filter((c) => !c.groupShares?.age).map((c) => c.id)).toEqual(["GI"]);
    expect(eu.constituencies.filter((c) => c.groupShares?.tenure).length).toBe(348);
    const indy = getEvent("indyref2014");
    expect(indy.constituencies.every((c) => c.groupShares?.age && c.groupShares?.class)).toBe(true);
  });

  it("reproduce the real 2016 and 2014 results", async () => {
    const { getEvent, modelInputFor } = await import("./data");
    const eu = buildModel(modelInputFor(getEvent("eu2016"))).baseline;
    expect(eu.votes.leave).toBe(17410742);
    expect(eu.votes.remain).toBe(16141241);
    expect(eu.seats.leave).toBe(263);
    const indy = buildModel(modelInputFor(getEvent("indyref2014"))).baseline;
    expect(indy.votes.no).toBe(2001926);
    expect(indy.seats.yes).toBe(4);
  });
});

// ---- two slices at once, and turnout dials ----
describe("combined slices", () => {
  const tenure: Dimension = {
    id: "tenure",
    label: "Housing",
    groups: [
      { id: "own", label: "Own", emoji: "🏡" },
      { id: "rent", label: "Rent", emoji: "🔑" },
    ],
  };
  const gv2 = {
    ...groupVoting,
    tenure: {
      source: "test",
      groups: {
        own: { voterShare: 0.65, turnout: 0.7, shares: { a: 0.35, b: 0.65 } },
        rent: { voterShare: 0.35, turnout: 0.5, shares: { a: 0.75, b: 0.25 } },
      },
    },
  } as unknown as GroupVoting;
  const w2: ModelInput = {
    ...world,
    dimensions: [dim, tenure],
    groupVoting: gv2,
    constituencies: world.constituencies.map((c) => ({ ...c, groupShares: undefined })),
  };
  const m = buildModel(w2);
  const run = (s: Parameters<typeof runScenario>[1]) => runScenario(m, s);
  const and = { dimension: "tenure", groups: ["rent"] };

  it("'only A and B' plus 'exclude A and B' adds back up to everyone", () => {
    const only = run({ dimension: "age", mode: "only", groups: ["young"], and });
    const ex = run({ dimension: "age", mode: "exclude", groups: ["young"], and });
    for (const p of ["a", "b"]) expect(only.votes[p] + ex.votes[p]).toBeCloseTo(m.baseline.votes[p], 6);
  });

  it("the four cells of a 2×2 combo add up to the real party votes in each seat", () => {
    const cells = ["young", "old"].flatMap((g) =>
      ["own", "rent"].map((h) => run({ dimension: "age", mode: "only", groups: [g], and: { dimension: "tenure", groups: [h] } })),
    );
    m.baseline.seatResults.forEach((s, i) => {
      for (const p of ["a", "b"]) expect(sum(cells.map((c) => c.seatResults[i].votes[p]))).toBeCloseTo(s.votes[p], 6);
    });
  });

  it("keeps both margins: summing the A cells over every B group gives the single-slice result", () => {
    const one = run({ dimension: "age", mode: "only", groups: ["young"] });
    const both = run({ dimension: "age", mode: "only", groups: ["young"], and: { dimension: "tenure", groups: ["own", "rent"] } });
    for (const p of ["a", "b"]) expect(both.votes[p]).toBeCloseTo(one.votes[p], 6);
  });

  it("matches estA × estB / votes by hand in one seat", () => {
    const c = w2.constituencies[0];
    const ea = m.estimates[c.id].age!;
    const eb = m.estimates[c.id].tenure!;
    const r = run({ dimension: "age", mode: "only", groups: ["young"], and });
    for (const p of ["a", "b"]) expect(r.seatResults[0].votes[p]).toBeCloseTo((ea.young[p] * eb.rent[p]) / c.votes[p], 6);
  });

  it("a combo is narrower than either slice alone", () => {
    const young = run({ dimension: "age", mode: "only", groups: ["young"] });
    const combo = run({ dimension: "age", mode: "only", groups: ["young"], and });
    expect(combo.totalVotes).toBeLessThan(young.totalVotes);
    expect(combo.totalVotes).toBeGreaterThan(0);
  });

  it("ignores a second slice on the same dimension or with nothing ticked", () => {
    const plain = run({ dimension: "age", mode: "only", groups: ["young"] });
    expect(run({ dimension: "age", mode: "only", groups: ["young"], and: { dimension: "age", groups: ["old"] } }).votes).toEqual(plain.votes);
    expect(run({ dimension: "age", mode: "only", groups: ["young"], and: { dimension: "tenure", groups: [] } }).votes).toEqual(plain.votes);
  });

  it("works on every real event without breaking seat counts", () => {
    for (const e of events) {
      const [d1, d2] = e.dimensions;
      const mm = buildModel(modelInputFor(e));
      const r = runScenario(mm, { dimension: d1.id, mode: "only", groups: [d1.groups[0].id], and: { dimension: d2.id, groups: [d2.groups[0].id] } });
      expect(sum(Object.values(r.seats))).toBe(e.constituencies.length);
      expect(r.totalVotes).toBeGreaterThan(0);
    }
  });
});

describe("turnout dials", () => {
  const model = buildModel(world);

  it("all dials at 1 reproduce the real result", () => {
    const r = runScenario(model, { dimension: "age", mode: "turnout", groups: [], turnout: { young: 1, old: 1 } });
    expect(r.votes.a).toBeCloseTo(model.baseline.votes.a, 6);
    expect(r.seats).toEqual(model.baseline.seats);
  });

  it("0 and 1 dials match the exclude and only presets", () => {
    const dial = runScenario(model, { dimension: "age", mode: "turnout", groups: [], turnout: { old: 0 } });
    const ex = runScenario(model, { dimension: "age", mode: "exclude", groups: ["old"] });
    expect(dial.votes).toEqual(ex.votes);
    const dial2 = runScenario(model, { dimension: "age", mode: "turnout", groups: [], turnout: { old: 0, young: 1 } });
    const only = runScenario(model, { dimension: "age", mode: "only", groups: ["young"] });
    expect(dial2.votes).toEqual(only.votes);
  });

  it("doubling a group's turnout doubles its votes", () => {
    const young = runScenario(model, { dimension: "age", mode: "only", groups: ["young"] });
    const r = runScenario(model, { dimension: "age", mode: "turnout", groups: [], turnout: { young: 2 } });
    expect(r.totalVotes).toBeCloseTo(model.baseline.totalVotes + young.totalVotes, 4);
  });

  it("clamps dials to 0–200%", () => {
    const f = scenarioFactors({ dimension: "age", mode: "turnout", groups: [], turnout: { young: 9, old: -1 } }, ["young", "old"]);
    expect(f.young[0]).toBe(MAX_TURNOUT_FACTOR);
    expect(f.old[0]).toBe(0);
  });

  it("with a second slice, only dials that slice's voters", () => {
    const tenureWorld: ModelInput = {
      ...world,
      dimensions: [dim, { id: "sex", label: "Sex", groups: [{ id: "f", label: "F", emoji: "" }, { id: "m", label: "M", emoji: "" }] }],
      groupVoting: {
        ...groupVoting,
        sex: { source: "t", groups: { f: { voterShare: 0.5, turnout: null, shares: { a: 0.5, b: 0.5 } }, m: { voterShare: 0.5, turnout: null, shares: { a: 0.5, b: 0.5 } } } },
      } as unknown as GroupVoting,
    };
    const mm = buildModel(tenureWorld);
    const r = runScenario(mm, { dimension: "age", mode: "turnout", groups: [], turnout: { young: 0 }, and: { dimension: "sex", groups: ["f"] } });
    const onlyYoungF = runScenario(mm, { dimension: "age", mode: "only", groups: ["young"], and: { dimension: "sex", groups: ["f"] } });
    expect(r.totalVotes).toBeCloseTo(mm.baseline.totalVotes - onlyYoungF.totalVotes, 4);
  });

  it("isNoOp spots scenarios that change nothing", () => {
    expect(isNoOp({ dimension: "age", mode: "only", groups: [] })).toBe(true);
    expect(isNoOp({ dimension: "age", mode: "turnout", groups: [], turnout: { young: 1 } })).toBe(true);
    expect(isNoOp({ dimension: "age", mode: "turnout", groups: [], turnout: { young: 1.5 } })).toBe(false);
  });
});

describe("turnout and combo presets", () => {
  it("'young people vote like pensioners' only shows up where age turnout is known, and copies the oldest group's rate", () => {
    const withIt = events.filter((e) => presetsFor(e).some((p) => p.label === "Young people vote like pensioners")).map((e) => e.id);
    expect(withIt).toEqual(expect.arrayContaining(["ge2010", "ge2015", "ge2017"]));
    expect(withIt).not.toContain("ge2019");
    expect(withIt).not.toContain("ge2024");
    const e = events.find((x) => x.id === "ge2017")!;
    const p = presetsFor(e).find((x) => x.label === "Young people vote like pensioners")!;
    const gv = e.groupVoting.age.groups;
    expect(p.scenario.turnout!["18-19"] * gv["18-19"].turnout!).toBeCloseTo(gv["70+"].turnout!, 2);
  });
  it("combo presets resolve where both slices exist", () => {
    const e = events.find((x) => x.id === "ge2019")!;
    expect(presetsFor(e).some((p) => p.id === "only-young-renters")).toBe(true);
  });
});
