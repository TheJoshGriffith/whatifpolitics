"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { referendumHeadline } from "./ReferendumResults";
import {
  allocateSeats,
  formGovernment,
  governmentHeadline,
  type VotingSystem,
} from "@/lib/systems";
import { buildModel, runScenario } from "@/lib/engine";
import { defaultEvent, events, getEvent, modelInputFor } from "@/lib/data";
import { presets, presetsFor } from "@/lib/presets";
import type { DimensionId, GroupId, Scenario, ScenarioMode } from "@/lib/types";
import { ScenarioPicker } from "./ScenarioPicker";
import { Results } from "./Results";
import { ReferendumResults } from "./ReferendumResults";

const initial = presetsFor(defaultEvent)[0] ?? presets[0];

export function WhatIfApp() {
  const [eventId, setEventId] = useState(defaultEvent.id);
  const event = useMemo(() => getEvent(eventId), [eventId]);
  const { parties, dimensions } = event;
  const model = useMemo(
    () => buildModel(modelInputFor(getEvent(eventId))),
    [eventId],
  );
  const eventPresets = presetsFor(event);
  const [dimension, setDimension] = useState<DimensionId>(
    initial.scenario.dimension,
  );
  const [mode, setMode] = useState<ScenarioMode>(initial.scenario.mode);
  const [groups, setGroups] = useState<GroupId[]>(initial.scenario.groups);
  const [presetId, setPresetId] = useState<string | null>(initial.id);
  const [building, setBuilding] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [resultsVisible, setResultsVisible] = useState(true);
  useEffect(() => {
    const el = resultsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => setResultsVisible(e.isIntersecting),
      { rootMargin: "0px 0px -35% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scenario = useMemo<Scenario | null>(
    () => (groups.length ? { dimension, mode, groups } : null),
    [dimension, mode, groups],
  );
  const result = useMemo(() => runScenario(model, scenario), [model, scenario]);
  const [system, setSystem] = useState<VotingSystem>("fptp");
  const seats = useMemo(() => allocateSeats(system, result), [system, result]);
  const formation = useMemo(
    () => formGovernment(eventId, seats),
    [eventId, seats],
  );
  const govHeadline = governmentHeadline(
    formation,
    seats,
    result.voteShares,
    parties,
    system,
  );

  const dim = dimensions.find((d) => d.id === dimension) ?? dimensions[0];

  const pickEvent = (id: string) => {
    const e = getEvent(id);
    setEventId(id);
    // Keep the current scenario if the new event has the same slice, otherwise start fresh.
    const same = e.dimensions.find((d) => d.id === dimension);
    if (!same) {
      const first = presetsFor(e)[0];
      if (first) {
        setDimension(first.scenario.dimension);
        setMode(first.scenario.mode);
        setGroups(first.scenario.groups);
        setPresetId(first.id);
      } else {
        setDimension(e.dimensions[0].id);
        setGroups([]);
        setPresetId(null);
      }
    } else {
      const ok = groups.filter((g) => same.groups.some((x) => x.id === g));
      setGroups(ok);
      if (ok.length !== groups.length) setPresetId(null);
    }
  };
  const describe = () => {
    if (!scenario)
      return `Nobody's been left out yet, so this is just the real ${event.label}.`;
    const labels = dim.groups
      .filter((g) => groups.includes(g.id))
      .map((g) => g.label);
    const list = joinNice(labels);
    return mode === "exclude"
      ? `${dim.label} · 🙅 ${list} stay at home…`
      : `${dim.label} · ☝️ Only ${list} turn up…`;
  };

  const summary =
    event.kind === "referendum"
      ? event.parties
          .map(
            (p) => `${p.short} ${(result.voteShares[p.id] * 100).toFixed(1)}%`,
          )
          .join(" · ")
      : [...parties]
          .filter((p) => (seats[p.id] ?? 0) > 0)
          .sort((a, b) => (seats[b.id] ?? 0) - (seats[a.id] ?? 0))
          .slice(0, 3)
          .map((p) => `${p.short} ${seats[p.id]}`)
          .join(" · ");

  return (
    <div className="flex flex-col gap-6 pb-24">
      <section aria-labelledby="events-h" className="flex flex-col gap-3">
        <h2
          id="events-h"
          className="font-display text-sm font-extrabold uppercase tracking-wider text-muted"
        >
          Pick a vote to re-run
        </h2>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Election"
        >
          {events.map((e) => {
            const on = e.id === eventId;
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pickEvent(e.id)}
                className={`chip px-3 py-1.5 text-sm font-extrabold ${on ? "bg-ink text-paper" : "bg-card hover:bg-sun"}`}
              >
                {e.short}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-ink/80">
          <b>{event.label}:</b> {event.blurb}
        </p>
      </section>

      <section aria-labelledby="presets-h" className="flex flex-col gap-3">
        <h2
          id="presets-h"
          className="font-display text-sm font-extrabold uppercase tracking-wider text-muted"
        >
          Pick a what-if
        </h2>
        <div className="flex flex-wrap gap-2">
          {eventPresets.map((p) => {
            const on = p.id === presetId;
            return (
              <button
                key={p.id}
                type="button"
                title={p.blurb}
                aria-pressed={on}
                onClick={() => {
                  setDimension(p.scenario.dimension);
                  setMode(p.scenario.mode);
                  setGroups(p.scenario.groups);
                  setPresetId(p.id);
                }}
                className={`chip px-3 py-1.5 text-sm font-bold ${on ? "bg-pink text-white" : "bg-card hover:bg-sun"}`}
              >
                <span aria-hidden>{p.emoji}</span> {p.label}
              </button>
            );
          })}
          <button
            type="button"
            aria-expanded={building}
            aria-controls="builder"
            onClick={() => setBuilding((b) => !b)}
            className={`chip px-3 py-1.5 text-sm font-extrabold ${building ? "bg-grape text-white" : "bg-sky/30 hover:bg-sun"}`}
          >
            <span aria-hidden>🛠️</span>{" "}
            {building ? "Hide the builder" : "Build your own…"}
          </button>
        </div>
        {!building && presetId === null && scenario && (
          <p className="text-sm font-bold text-ink/70">
            Custom what-if: {describe()}
          </p>
        )}
      </section>

      {building && (
        <div id="builder">
          <ScenarioPicker
            dimensions={dimensions}
            groupVoting={event.groupVoting}
            dimension={dimension}
            mode={mode}
            groups={groups}
            onDimension={(d) => {
              setDimension(d);
              setGroups([]);
              setPresetId(null);
            }}
            onMode={(m) => {
              setMode(m);
              setPresetId(null);
            }}
            onToggleGroup={(g) => {
              setGroups((gs) =>
                gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g],
              );
              setPresetId(null);
            }}
            onReset={() => {
              setGroups([]);
              setPresetId(null);
            }}
          />
        </div>
      )}

      <div ref={resultsRef} className="scroll-mt-4" id="results">
        {event.kind === "referendum" ? (
          <ReferendumResults
            result={result}
            baseline={model.baseline}
            event={event}
            description={describe()}
            isBaseline={!scenario}
          />
        ) : (
          <Results
            result={result}
            baseline={model.baseline}
            parties={parties}
            event={event}
            description={describe()}
            isBaseline={!scenario}
            system={system}
            onSystem={setSystem}
            seats={seats}
            formation={formation}
            headline={govHeadline}
          />
        )}
      </div>

      {!resultsVisible && (
        <button
          type="button"
          onClick={() =>
            resultsRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          className="chip fixed inset-x-3 bottom-3 z-20 mx-auto flex max-w-xl items-center gap-3 bg-sun px-4 py-3 text-left shadow-lg sm:bottom-5"
        >
          <span className="min-w-0 flex-1 text-sm font-extrabold leading-snug">
            {!scenario
              ? `The real ${event.label}.`
              : event.kind === "referendum"
                ? referendumHeadline(result, model.baseline, event)
                : govHeadline}
          </span>
          <span className="flex shrink-0 flex-col items-end text-xs font-bold text-ink/70">
            <span className="tabular-nums">{summary}</span>
            <span>See it ↓</span>
          </span>
        </button>
      )}
    </div>
  );
}

function joinNice(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}
