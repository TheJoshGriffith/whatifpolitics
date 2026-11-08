import { describe, expect, it } from "vitest";
import { buildModel, runScenario } from "./engine";
import { getEvent, modelInputFor } from "./data";
import { presetsFor } from "./presets";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("2005 general election", () => {
  const ev = getEvent("ge2005");
  const base = buildModel(modelInputFor(ev)).baseline;
  it("is loaded as its own event", () => {
    expect(ev.id).toBe("ge2005");
    expect(ev.constituencies).toHaveLength(646);
  });
  it("baseline reproduces the official result", () => {
    expect(base.seats).toMatchObject({ lab: 355, con: 198, ld: 62, dup: 9, snp: 6, sf: 5, sdlp: 3, pc: 3, ind: 2, respect: 1, uup: 1, spk: 1 });
    expect(base.totalVotes).toBe(27148510);
    expect(base.votes).toMatchObject({ lab: 9552436, con: 8784915, ld: 5985454, ukip: 605973 });
    expect(base.government.majorityNeeded).toBe(324);
  });
  it("voter mixes sum to 1 and presets run", () => {
    for (const d of ev.dimensions)
      expect(sum(d.groups.map((g) => ev.groupVoting[d.id].groups[g.id].voterShare))).toBeCloseTo(1, 3);
    const m = buildModel(modelInputFor(ev));
    const ps = presetsFor(ev);
    expect(ps.length).toBeGreaterThan(5);
    for (const p of ps) expect(sum(Object.values(runScenario(m, p.scenario).seats))).toBe(646);
  });
});
