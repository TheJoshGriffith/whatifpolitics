import { describe, expect, it } from "vitest";
import { events, getEvent } from "./data";
import { partyCosts, seatRecords, summarise } from "./records";

describe("record book", () => {
  it("summarises a real election", () => {
    const s = summarise(getEvent("ge2024"));
    expect(s.winner).toBe("lab");
    expect(s.winnerSeats).toBe(411);
    expect(s.majority).toBe(2 * 411 - 650);
    expect(s.voteShares.lab).toBeCloseTo(0.337, 2);
    expect(s.prSeats).toBeLessThan(s.winnerSeats);
  });
  it("counts every vote cast in 1997", () => {
    const s = summarise(getEvent("ge1997"));
    expect(s.totalVotes).toBe(31286284);
    expect(s.voteShares.lab).toBeCloseTo(0.432, 3);
  });
  it("finds the closest seats and leaves lumped buckets out", () => {
    const general = events.filter((e) => e.kind === "general");
    const seats = seatRecords(general);
    const closest = [...seats].sort((a, b) => a.majorityVotes - b.majorityVotes)[0];
    expect(closest.majorityVotes).toBe(2);
    for (const s of seats) expect(["other", "ni", "spk"]).not.toContain(s.winner);
    for (const c of partyCosts(general.map(summarise))) expect(["other", "ni", "spk", "ind"]).not.toContain(c.party);
  });
});
