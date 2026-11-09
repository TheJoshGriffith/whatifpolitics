"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { maxTurnoutFactor, runScenario, type Model } from "@/lib/engine";
import type { ElectionEvent } from "@/lib/types";
import { HexMap } from "./HexMap";

const FRAMES = 50;
const FRAME_MS = 110;

/**
 * Turnout time-lapse: pick one group, press play, and watch its turnout slide from
 * "everyone stayed home" to the most the dial allows, with seats flipping as it goes.
 */
export function TurnoutSweep({ event, model }: { event: ElectionEvent; model: Model }) {
  const general = event.kind === "general";
  const firstDim = event.dimensions.find((d) => d.id === "age") ?? event.dimensions[0];
  const [dimId, setDimId] = useState(firstDim.id);
  const dim = event.dimensions.find((d) => d.id === dimId) ?? firstDim;
  const [groupId, setGroupId] = useState(dim.groups[0].id);
  const group = dim.groups.find((g) => g.id === groupId) ?? dim.groups[0];
  const gv = event.groupVoting[dim.id]?.groups[group.id];
  const max = maxTurnoutFactor(gv?.turnout);
  const [factor, setFactor] = useState(1);
  const [playing, setPlaying] = useState(false);

  // The parent remounts this per vote (key), so state never outlives its event.
  const startFrame = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let frame = startFrame.current;
    const t = setInterval(() => {
      frame++;
      if (frame > FRAMES) {
        setPlaying(false);
        return;
      }
      setFactor(Math.round(((max * frame) / FRAMES) * 100) / 100);
    }, FRAME_MS);
    return () => clearInterval(t);
  }, [playing, max]);
  const togglePlay = () => {
    if (playing) return setPlaying(false);
    // Carry on from a pause; otherwise start from "nobody turns up".
    const resume = factor > 0 && factor < max && factor !== 1;
    startFrame.current = resume ? Math.round((factor / max) * FRAMES) : 0;
    if (!resume) setFactor(0);
    setPlaying(true);
  };

  const result = useMemo(
    () =>
      factor === 1
        ? model.baseline
        : runScenario(model, { dimension: dim.id, mode: "turnout", groups: [], turnout: { [group.id]: factor } }),
    [model, dim.id, group.id, factor],
  );
  const flipped = result.flipped.length;
  const top = [...event.parties]
    .map((p) => ({ p, n: general ? (result.seats[p.id] ?? 0) : result.voteShares[p.id] ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, general ? 5 : 2);
  const realTurnout = typeof gv?.turnout === "number" ? gv.turnout : null;
  const areaWord = general ? "seats" : event.id === "indyref2014" ? "councils" : "areas";

  return (
    <section aria-labelledby="sweep-h" className="card flex flex-col gap-3 p-4 sm:p-5">
      <h2 id="sweep-h" className="font-display text-lg font-extrabold">
        🎬 Turnout time-lapse
      </h2>
      <p className="text-sm text-ink/80">
        Pick a group and press play. Their turnout slides from nobody turning up to as many as the dial allows,
        and you can watch {areaWord} change hands as it goes. Everyone else votes as they really did.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-extrabold">
          Slice
          <select
            value={dim.id}
            onChange={(e) => {
              const d = event.dimensions.find((x) => x.id === e.target.value) ?? firstDim;
              setPlaying(false);
              setDimId(d.id);
              setGroupId(d.groups[0].id);
              setFactor(1);
            }}
            className="rounded-xl border-2 border-ink bg-card px-2 py-1.5 text-sm font-bold"
          >
            {event.dimensions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-extrabold">
          Group
          <select
            value={group.id}
            onChange={(e) => {
              setPlaying(false);
              setGroupId(e.target.value);
              setFactor(1);
            }}
            className="rounded-xl border-2 border-ink bg-card px-2 py-1.5 text-sm font-bold"
          >
            {dim.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={togglePlay}
          className={`chip px-3 py-1.5 text-sm font-extrabold ${playing ? "bg-pink text-white" : "bg-sun hover:bg-mint"}`}
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>
      <label className="flex flex-col gap-1 text-sm font-bold">
        <span>
          {group.label} turnout: <span className="tabular-nums">{Math.round(factor * 100)}%</span> of the real figure
          {realTurnout !== null && (
            <span className="text-muted">
              {" "}
              (about {Math.round(Math.min(1, factor * realTurnout) * 100)}% of them voting, against{" "}
              {Math.round(realTurnout * 100)}% really)
            </span>
          )}
        </span>
        <input
          type="range"
          min={0}
          max={max}
          step={0.01}
          value={factor}
          onChange={(e) => {
            setPlaying(false);
            setFactor(Number(e.target.value));
          }}
          className="accent-grape"
          aria-label={`${group.label} turnout, as a share of the real figure`}
        />
      </label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-sun/40 px-3 py-2" aria-live="off">
        <span className="font-display text-2xl font-extrabold tabular-nums">{flipped}</span>
        <span className="text-sm font-bold">
          {areaWord} change hands
        </span>
        <span className="flex flex-wrap gap-x-3 text-sm font-bold tabular-nums">
          {top.map(({ p, n }) => (
            <span key={p.id}>
              <span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.colour }} />
              {p.short} {general ? n : `${(n * 100).toFixed(1)}%`}
            </span>
          ))}
        </span>
      </div>
      {event.map && (
        <HexMap
          map={event.map}
          seatResults={result.seatResults}
          baselineResults={model.baseline.seatResults}
          parties={event.parties}
          areaWord={general ? "seat" : event.id === "indyref2014" ? "council" : "area"}
          isBaseline={factor === 1}
        />
      )}
    </section>
  );
}
