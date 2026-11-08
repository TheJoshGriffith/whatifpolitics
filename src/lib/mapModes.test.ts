import { describe, expect, it } from "vitest";
import { buildModel, runScenario } from "./engine";
import { getEvent, modelInputFor } from "./data";
import { allocateSeats, regionalAllocation } from "./systems";
import { assignRegionalSeats, divergingColour, niceScale, searchSeats, seatVoterMix } from "./mapModes";

const event = getEvent("ge2024");
const base = buildModel(modelInputFor(event)).baseline;

describe("regional map shading", () => {
  const regions = regionalAllocation(base);
  it("regional allocation matches the regional-lists seat totals", () => {
    const sum: Record<string, number> = {};
    for (const r of regions) for (const [p, n] of Object.entries(r.seats)) sum[p] = (sum[p] ?? 0) + n;
    const seats = allocateSeats("regional", base);
    for (const [p, n] of Object.entries(seats)) expect(sum[p] ?? 0).toBe(n);
  });
  it("every seat gets a party and each region's counts match its seats", () => {
    const assigned = assignRegionalSeats(base.seatResults, regions);
    expect(Object.keys(assigned)).toHaveLength(base.seatResults.length);
    for (const r of regions) {
      const got: Record<string, number> = {};
      for (const s of base.seatResults.filter((x) => x.region === r.region)) got[assigned[s.id]] = (got[assigned[s.id]] ?? 0) + 1;
      for (const [p, n] of Object.entries(r.seats)) expect(got[p] ?? 0).toBe(n);
    }
  });
});

describe("swing colour scale", () => {
  it("is grey at zero and saturates at the ends", () => {
    expect(divergingColour(0, 0.1)).toBe("rgb(238,234,226)");
    expect(divergingColour(-0.5, 0.1)).toBe(divergingColour(-0.1, 0.1));
    expect(divergingColour(0.1, 0.1)).toBe("rgb(12,133,136)");
  });
  it("picks a tidy range", () => {
    expect(niceScale(0.031)).toBe(0.05);
    expect(niceScale(0.12)).toBe(0.15);
    expect(niceScale(0)).toBe(0.02);
  });
});

describe("seat search", () => {
  const items = [{ name: "Ynys Môn" }, { name: "Islington North" }, { name: "North Norfolk" }, { name: "Norwich North" }];
  it("ignores accents and case", () => {
    expect(searchSeats(items, "ynys mon").map((x) => x.name)).toEqual(["Ynys Môn"]);
  });
  it("ranks prefix matches before word and substring matches", () => {
    expect(searchSeats(items, "nor").map((x) => x.name)).toEqual(["North Norfolk", "Norwich North", "Islington North"]);
  });
  it("returns nothing for an empty query", () => {
    expect(searchSeats(items, "  ")).toEqual([]);
  });
});

describe("seat voter mix", () => {
  it("uses the seat's own mix and greys out removed groups", () => {
    const seat = event.constituencies.find((c) => c.groupShares?.age)!;
    const groups = event.dimensions.find((d) => d.id === "age")!.groups;
    const mix = seatVoterMix(event, seat, "age", { dimension: "age", mode: "exclude", groups: [groups[0].id] })!;
    expect(mix.local).toBe(true);
    expect(mix.rows.reduce((a, r) => a + r.local, 0)).toBeCloseTo(1, 2);
    expect(mix.rows.find((r) => r.id === groups[0].id)!.kept).toBe(false);
    expect(mix.rows.filter((r) => r.kept)).toHaveLength(groups.length - 1);
  });
  it("still works for a scenario on a different dimension", () => {
    const seat = event.constituencies[0];
    const r = runScenario(buildModel(modelInputFor(event)), { dimension: "age", mode: "only", groups: ["18-24"] });
    const mix = seatVoterMix(event, seat, "class", r.scenario)!;
    expect(mix.rows.every((x) => x.kept)).toBe(true);
  });
});
