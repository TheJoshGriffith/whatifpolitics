import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare, type ShareState } from "./share";
import { events } from "./data";

const systems = ["fptp", "pr", "pr5", "regional"];

describe("shareable links", () => {
  it("round-trips a combo with a voting system", () => {
    const s: ShareState = {
      eventId: "ge2019",
      dimension: "age",
      mode: "only",
      groups: ["18-19", "20-24"],
      turnout: {},
      and: { dimension: "tenure", groups: ["private", "social"] },
      system: "pr",
    };
    const qs = encodeShare(s);
    expect(qs).toBe("e=ge2019&d=age&m=only&g=18-19,20-24&d2=tenure&g2=private,social&s=pr");
    expect(decodeShare(qs, events, systems)).toEqual(s);
  });

  it("round-trips turnout dials as whole percentages", () => {
    const s: ShareState = { eventId: "ge2017", dimension: "age", mode: "turnout", groups: [], turnout: { "18-19": 1.5, "70+": 0 }, and: null, system: "fptp" };
    const qs = encodeShare(s);
    expect(qs).toBe("e=ge2017&d=age&m=turnout&t=18-19:150,70+:0");
    expect(decodeShare(qs, events, systems)).toEqual(s);
    // a "+" written by hand or by URLSearchParams still decodes
    expect(decodeShare("?e=ge2017&d=age&m=turnout&t=70%2B:50", events, systems)?.turnout).toEqual({ "70+": 0.5 });
  });

  it("drops anything that doesn't exist in the event", () => {
    const d = decodeShare("e=ge2024&d=age&m=sideways&g=18-24,99-100&d2=age&g2=18-24&s=dice", events, systems)!;
    expect(d.mode).toBe("only");
    expect(d.groups).toEqual(["18-24"]);
    expect(d.and).toBeNull();
    expect(d.system).toBe("fptp");
    expect(decodeShare("e=nope", events, systems)).toBeNull();
    expect(decodeShare("", events, systems)).toBeNull();
  });

  it("clamps silly dial values", () => {
    const d = decodeShare("e=ge2017&d=age&m=turnout&t=18-19:900,20-24:-5,25-29:abc", events, systems)!;
    expect(d.turnout).toEqual({ "18-19": 2, "20-24": 0 });
  });
});
