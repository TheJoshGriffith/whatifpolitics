"use client";

import { useMemo, useState } from "react";
import { buildModel, runScenario } from "@/lib/engine";
import { dimensions, modelInput, parties } from "@/lib/data";
import { presets } from "@/lib/presets";
import type { DimensionId, GroupId, Scenario, ScenarioMode } from "@/lib/types";
import { ScenarioPicker } from "./ScenarioPicker";
import { Results } from "./Results";

const initial = presets[0];

export function WhatIfApp() {
  const model = useMemo(() => buildModel(modelInput), []);
  const [dimension, setDimension] = useState<DimensionId>(initial.scenario.dimension);
  const [mode, setMode] = useState<ScenarioMode>(initial.scenario.mode);
  const [groups, setGroups] = useState<GroupId[]>(initial.scenario.groups);
  const [presetId, setPresetId] = useState<string | null>(initial.id);

  const scenario = useMemo<Scenario | null>(
    () => (groups.length ? { dimension, mode, groups } : null),
    [dimension, mode, groups],
  );
  const result = useMemo(() => runScenario(model, scenario), [model, scenario]);

  const dim = dimensions.find((d) => d.id === dimension)!;
  const describe = () => {
    if (!scenario) return "Nobody's been left out yet, so this is just the real 2024 result.";
    const labels = dim.groups.filter((g) => groups.includes(g.id)).map((g) => g.label);
    const list = joinNice(labels);
    return mode === "exclude"
      ? `${dim.label} · 🙅 ${list} stay at home…`
      : `${dim.label} · ☝️ Only ${list} turn up…`;
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="presets-h" className="flex flex-col gap-3">
        <h2 id="presets-h" className="font-display text-sm font-extrabold uppercase tracking-wider text-muted">
          Quick-fire rounds
        </h2>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
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
