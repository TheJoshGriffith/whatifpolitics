import { describe, expect, it } from "vitest";
import { finalPolls, pollsterTable, scoreVote } from "./pollAccuracy";

const vote = (id: string) => scoreVote(finalPolls.find((v) => v.eventId === id)!);

describe("polling accuracy", () => {
  it("has every vote's final polls", () => {
    expect(finalPolls.length).toBe(14);
    for (const v of finalPolls) expect(v.polls.length).toBeGreaterThanOrEqual(5);
  });
  it("finds the famous misses", () => {
    // 1992: only Gallup (by half a point) had the Conservatives ahead; they won GB by 7.6.
    const v92 = vote("ge1992");
    expect(v92.called).toBe(1);
    expect(v92.leadError).toBeLessThan(-6);
    // 2015: the polls had it neck and neck; the Conservatives won GB by about 6.5.
    expect(vote("ge2015").leadError).toBeLessThan(-4);
    // EU 2016: most final polls had Remain ahead.
    const eu = vote("eu2016");
    expect(eu.called).toBeLessThan(eu.scores.length / 2);
  });
  it("leaves undecideds out of referendum polls", () => {
    const eu = vote("eu2016");
    const tns = eu.scores.find((s) => s.poll.pollster === "TNS")!;
    expect(eu.vote.result.leave + tns.errors.leave).toBeCloseTo((43 / 84) * 100, 5);
  });
  it("joins MORI and Ipsos in the pollster table", () => {
    const t = pollsterTable(finalPolls.map(scoreVote));
    expect(t.some((r) => r.pollster === "Ipsos (MORI)" && r.votes >= 10)).toBe(true);
  });
});
