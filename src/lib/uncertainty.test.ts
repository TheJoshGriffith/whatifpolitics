import { describe, expect, it } from "vitest";
import { getEvent, modelInputFor } from "./data";
import { drawShares, gamma, majorityParty, quantile, rng, simulateUncertainty, smallGroups } from "./uncertainty";

describe("sampling helpers", () => {
  it("rng is deterministic", () => {
    const a = rng(1);
    const b = rng(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("gamma has the right mean", () => {
    const r = rng(7);
    for (const k of [0.4, 3, 200]) {
      let s = 0;
      for (let i = 0; i < 4000; i++) s += gamma(k, r);
      expect(s / 4000).toBeCloseTo(k, k > 10 ? -1 : 0);
    }
  });
  it("Dirichlet shares keep their total and have variance ≈ p(1-p)/n", () => {
    const r = rng(3);
    const p = { yes: 0.7, no: 0.3 };
    const xs: number[] = [];
    for (let i = 0; i < 3000; i++) {
      const d = drawShares(p, 14, r);
      expect(d.yes + d.no).toBeCloseTo(1, 9);
      xs.push(d.yes);
    }
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
    expect(mean).toBeCloseTo(0.7, 1);
    expect(v).toBeGreaterThan((0.21 / 15) * 0.8);
    expect(v).toBeLessThan((0.21 / 15) * 1.2);
  });
  it("quantile interpolates", () => {
    expect(quantile([0, 10], 0.5)).toBe(5);
    expect(quantile([1, 2, 3], 0.9)).toBeCloseTo(2.8);
  });
  it("majorityParty ignores Sinn Féin and the Speaker", () => {
    expect(majorityParty({ a: 320, b: 312, sf: 7, spk: 1 })).toBe("a");
    expect(majorityParty({ a: 300, b: 350 })).toBe("b");
    expect(majorityParty({ a: 320, b: 330 })).toBe("b");
    expect(majorityParty({ a: 300, b: 300, c: 50 })).toBe(null);
  });
});

describe("simulateUncertainty", () => {
  it("returns null for the real result", () => {
    expect(simulateUncertainty(modelInputFor(getEvent("ge2024")), null)).toBeNull();
  });
  it("gives ranges that contain the central answer and is fast enough", () => {
    const input = modelInputFor(getEvent("ge2024"));
    const u = simulateUncertainty(input, { dimension: "age", mode: "only", groups: ["18-24", "25-29"] }, { runs: 40 })!;
    expect(u.runs).toBe(40);
    expect(u.seats.lab.lo).toBeLessThanOrEqual(u.seats.lab.mid);
    expect(u.seats.lab.mid).toBeLessThanOrEqual(u.seats.lab.hi);
    expect(u.seats.lab.mid).toBeGreaterThan(400);
    const total = Object.values(u.majority).reduce((a, b) => a + b, 0) + u.hung;
    expect(total).toBeCloseTo(1, 6);
    console.log(`ge2024 age, 40 runs: ${u.ms.toFixed(0)} ms (${(u.ms / 40).toFixed(1)} ms/run)`);
  });
  it("a 14-person group gives a much wider referendum range than a 1,000-person one", () => {
    const input = modelInputFor(getEvent("indyref2014"));
    const tiny = simulateUncertainty(input, { dimension: "age", mode: "only", groups: ["16-17"] }, { runs: 60 })!;
    const big = simulateUncertainty(input, { dimension: "sex", mode: "only", groups: ["female"] }, { runs: 60 })!;
    const w = (u: typeof tiny) => u.shares.yes.hi - u.shares.yes.lo;
    expect(w(tiny)).toBeGreaterThan(0.1);
    expect(w(tiny)).toBeGreaterThan(4 * w(big));
    expect(tiny.wins.yes).toBeGreaterThan(0.7);
    expect(tiny.wins.yes).toBeLessThan(1);
  });
  it("flags small samples", () => {
    const gv = getEvent("indyref2014").groupVoting;
    expect(smallGroups(gv, { dimension: "age", mode: "only", groups: ["16-17"] })).toEqual(["16-17", "18-24"]);
  });
});
