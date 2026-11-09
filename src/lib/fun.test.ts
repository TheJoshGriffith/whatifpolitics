import { describe, expect, it } from "vitest";
import { buildModel, isNoOp, runScenario } from "./engine";
import { events, getEvent, modelInputFor } from "./data";
import { randomPick, randomScenario, MIN_SAMPLE } from "./random";
import { bestTippingPoints, findTippingPoints, outcomeOf } from "./tipping";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("randomScenario", () => {
  it("always gives a real, valid what-if", () => {
    const rng = seeded(7);
    for (let i = 0; i < 300; i++) {
      const { event, scenario } = randomPick(events, rng);
      expect(isNoOp(scenario)).toBe(false);
      const dim = event.dimensions.find((d) => d.id === scenario.dimension)!;
      expect(dim).toBeTruthy();
      for (const g of scenario.groups) expect(dim.groups.some((x) => x.id === g)).toBe(true);
      expect(scenario.groups.length).toBeLessThan(dim.groups.length + (scenario.mode === "turnout" ? 1 : 0));
      if (scenario.and) {
        expect(scenario.and.dimension.includes(scenario.dimension)).toBe(false);
        expect(scenario.dimension.includes(scenario.and.dimension)).toBe(false);
      }
      if (scenario.mode === "only" && !scenario.and) {
        const n = scenario.groups.reduce((a, g) => a + (event.groupVoting[dim.id].groups[g].n ?? Infinity), 0);
        expect(n).toBeGreaterThanOrEqual(MIN_SAMPLE);
      }
    }
  });
  it("is repeatable with the same seed", () => {
    const e = getEvent("ge2019");
    expect(randomScenario(e, seeded(3))).toEqual(randomScenario(e, seeded(3)));
  });
});

describe("tipping points", () => {
  const event = getEvent("ge2024");
  const model = buildModel(modelInputFor(event));
  const base = outcomeOf(event, model.baseline);
  const points = findTippingPoints(model, event);
  it("starts from the real result", () => {
    expect(base).toMatchObject({ key: "maj:lab", majority: true });
  });
  it("every point really changes the outcome", () => {
    expect(points.length).toBeGreaterThan(0);
    for (const p of points) {
      expect(p.outcome.key).not.toBe(base.key); expect(p.level).toBe("government");
      expect(outcomeOf(event, runScenario(model, p.scenario)).key).toBe(p.outcome.key);
    }
  });
  it("ranks the cheapest first", () => {
    const best = bestTippingPoints(points);
    for (let i = 1; i < best.length; i++) expect(best[i].moved).toBeGreaterThanOrEqual(best[i - 1].moved);
    console.log(best.map((p) => `${p.dimension}/${p.group} x${p.factor} moved ${(p.moved * 100).toFixed(1)}% -> ${p.outcome.key}`).join("\n"));
  });
  it("works for a referendum", () => {
    const eu = getEvent("eu2016");
    const m = buildModel(modelInputFor(eu));
    expect(outcomeOf(eu, m.baseline).key).toBe("win:leave");
    const pts = findTippingPoints(m, eu);
    expect(pts.length).toBeGreaterThan(0);
    console.log(bestTippingPoints(pts).map((p) => `${p.dimension}/${p.group} x${p.factor} moved ${(p.moved * 100).toFixed(1)}%`).join("\n"));
  });
});

describe("opposition-level tipping points", () => {
  it("finds who-comes-second changes in every general election", () => {
    for (const id of ["ge2024", "ge2019", "ge2017", "ge2015", "ge2010"]) {
      const e = getEvent(id);
      const m = buildModel(modelInputFor(e));
      const t = performance.now();
      const g = findTippingPoints(m, e, "fptp", "government");
      const o = findTippingPoints(m, e, "fptp", "opposition");
      console.log(id, Math.round(performance.now() - t), "ms",
        bestTippingPoints(g, 3).map((p) => `${p.group} x${p.factor} ${(p.moved * 100).toFixed(1)}% ${p.outcome.key}`).join("; "), "||",
        bestTippingPoints(o.filter((p) => !g.some(q => q.group === p.group && q.factor === p.factor)), 3).map((p) => `${p.group} x${p.factor} ${(p.moved * 100).toFixed(1)}% ${p.outcome.key}/${p.outcome.second}`).join("; "));
    }
  }, 60000);
});
