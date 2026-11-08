"use client";

import { useMemo, useState } from "react";
import { buildModel, runScenario } from "@/lib/engine";
import { defaultEvent, events, getEvent, modelInputFor } from "@/lib/data";
import { presets, presetsFor } from "@/lib/presets";
import type { DimensionId, GroupId, Scenario, ScenarioMode } from "@/lib/types";
import { ScenarioPicker } from "./ScenarioPicker";
import { Results } from "./Results";

const initial = presetsFor(defaultEvent)[0] ?? presets[0];

export function WhatIfApp() {
  const [eventId, setEventId] = useState(defaultEvent.id);
  const event = useMemo(() => getEvent(eventId), [eventId]);
  const { parties, dimensions } = event;
  const model = useMemo(() => buildModel(modelInputFor(getEvent(eventId))), [eventId]);
  const eventPresets = presetsFor(event);
  const [dimension, setDimension] = useState<DimensionId>(initial.scenario.dimension);
  const [mode, setMode] = useState<ScenarioMode>(initial.scenario.mode);
  const [groups, setGroups] = useState<GroupId[]>(initial.scenario.groups);
  const [presetId, setPresetId] = useState<string | null>(initial.id);

  const scenario = useMemo<Scenario | null>(
    () => (groups.length ? { dimension, mode, groups } : null),
    [dimension, mode, groups],
  );
  const result = useMemo(() => runScenario(model, scenario), [model, scenario]);

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
    if (!scenario) return `Nobody's been left out yet, so this is just the real ${event.label}.`;
    const labels = dim.groups.filter((g) => groups.includes(g.id)).map((g) => g.label);
    const list = joinNice(labels);
    return mode === "exclude"
      ? `${dim.label} · 🙅 ${list} stay at home…`
      : `${dim.label} · ☝️ Only ${list} turn up…`;
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="events-h" className="flex flex-col gap-3">
        <h2 id="events-h" className="font-display text-sm font-extrabold uppercase tracking-wider text-muted">
          Pick a vote to re-run
        </h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Election">
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
        <h2 id="presets-h" className="font-display text-sm font-extrabold uppercase tracking-wider text-muted">
          Quick-fire rounds
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
        </div>
      </section>

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
          setGroups((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));
          setPresetId(null);
        }}
        onReset={() => {
          setGroups([]);
          setPresetId(null);
        }}
      />

      <Results
        result={result}
        baseline={model.baseline}
        parties={parties}
        event={event}
        description={describe()}
        isBaseline={!scenario}
      />
    </div>
  );
}

function joinNice(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}
