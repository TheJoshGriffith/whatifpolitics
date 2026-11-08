import { describe, expect, it } from "vitest";
import { buildModel } from "./engine";
import { getEvent, modelInputFor } from "./data";
import { allocateSeats, formGovernment, gallagher, willingness } from "./systems";

describe("voting systems", () => {
  const base = buildModel(modelInputFor(getEvent("ge2024"))).baseline;
  it("every system fills all 650 seats", () => {
    for (const s of ["fptp", "pr", "pr5", "regional"] as const) {
      const seats = allocateSeats(s, base);
      expect(Object.values(seats).reduce((a, b) => a + b, 0)).toBe(650);
    }
  });
  it("the 5% bar shuts out parties under 5%", () => {
    const seats = allocateSeats("pr5", base);
    expect(seats.snp ?? 0).toBe(0);
    expect(seats.reform).toBeGreaterThan(90);
  });
  it("pure PR is far fairer than FPTP in 2024", () => {
    expect(gallagher(allocateSeats("fptp", base), base.voteShares)).toBeGreaterThan(20);
    expect(gallagher(allocateSeats("pr", base), base.voteShares)).toBeLessThan(5);
  });
});

describe("forming a government", () => {
  it("a majority party governs alone", () => {
    const f = formGovernment("ge2024", { lab: 411, con: 121, sf: 7 });
    expect(f.majorityParty).toBe("lab");
    expect(f.pmChance.lab).toBe(1);
  });
  it("2010's real result most likely gives Con + LD", () => {
    const base = buildModel(modelInputFor(getEvent("ge2010"))).baseline;
    const f = formGovernment("ge2010", base.seats);
    expect(f.deals[0].parties).toEqual(["con", "ld"]);
    const total = f.deals.reduce((a, d) => a + d.chance, 0);
    expect(total).toBeCloseTo(1, 6);
  });
  it("Sinn Féin's seats don't count towards the line", () => {
    const f = formGovernment("ge2017", { con: 317, lab: 262, sf: 7, dup: 10, snp: 35, ld: 12, spk: 1 });
    expect(f.workingMajority).toBe(319);
    expect(f.votingSeats).toBe(636);
  });
  it("willingness is symmetric and era-aware", () => {
    expect(willingness("ge2017", "dup", "con")).toBe(willingness("ge2017", "con", "dup"));
    expect(willingness("ge2015", "lab", "snp")).toBeLessThan(willingness("ge2019", "lab", "snp"));
  });
});
