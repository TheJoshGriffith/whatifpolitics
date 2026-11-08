"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { referendumHeadline } from "./ReferendumResults";
import {
  allocateSeats,
  formGovernment,
  governmentHeadline,
  systems,
  type VotingSystem,
} from "@/lib/systems";
import { buildModel, isNoOp, maxTurnoutFactor, runScenario } from "@/lib/engine";
import { defaultEvent, events, getEvent, modelInputFor } from "@/lib/data";
import { presets, presetsFor } from "@/lib/presets";
import { decodeShare, encodeShare } from "@/lib/share";
import type {
  DimensionId,
  ElectionEvent,
  GroupId,
  Scenario,
  ScenarioMode,
} from "@/lib/types";
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
  const [turnout, setTurnout] = useState<Record<GroupId, number>>(
    initial.scenario.turnout ?? {},
  );
  const [andDim, setAndDim] = useState<DimensionId | null>(
    initial.scenario.and?.dimension ?? null,
  );
  const [andGroups, setAndGroups] = useState<GroupId[]>(
    initial.scenario.and?.groups ?? [],
  );
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

  const scenario = useMemo<Scenario | null>(() => {
    const s: Scenario = { dimension, mode, groups };
    if (mode === "turnout") s.turnout = turnout;
    if (andDim && andDim !== dimension && andGroups.length)
      s.and = { dimension: andDim, groups: andGroups };
    return isNoOp(s) ? null : s;
  }, [dimension, mode, groups, turnout, andDim, andGroups]);
  const result = useMemo(() => runScenario(model, scenario), [model, scenario]);
  const [system, setSystem] = useState<VotingSystem>("fptp");

  /** Load a whole scenario (from a preset or a shared link) into the builder. */
  const applyScenario = (s: Scenario) => {
    setDimension(s.dimension);
    setMode(s.mode);
    setGroups(s.mode === "turnout" ? [] : s.groups);
    setTurnout(s.turnout ?? {});
    setAndDim(s.and?.dimension ?? null);
    setAndGroups(s.and?.groups ?? []);
  };

  // ---- shareable links ----
  // Normal build: ?e=ge2019&d=age&...  Preview build (pages live on #hashes): #play?e=...
  const restored = useRef(false);
  useEffect(() => {
    // Read the link once on load (the static HTML can't know it), like HashViews does.
    const read = () => {
      const fromHash = window.location.hash.match(/^#(?:play)?\?(.*)$/)?.[1];
      const st =
        (fromHash && decodeShare(fromHash, events, systemIds)) ||
        decodeShare(window.location.search, events, systemIds);
      if (st) {
        const e = getEvent(st.eventId);
        const dimRow = e.groupVoting[st.dimension]?.groups ?? {};
        const dials: Record<GroupId, number> = {};
        for (const [g, f] of Object.entries(st.turnout))
          dials[g] = Math.min(f, maxTurnoutFactor(dimRow[g]?.turnout));
        const s: Scenario = {
          dimension: st.dimension,
          mode: st.mode,
          groups: st.groups,
          turnout: dials,
          ...(st.and ? { and: st.and } : {}),
        };
        setEventId(e.id);
        applyScenario(s);
        setSystem(st.system as VotingSystem);
        setPresetId(matchPreset(e, s));
        if (st.mode === "turnout" || st.and) setBuilding(true);
      }
    };
    read();
    restored.current = true;
    // A pasted #play?... link in the preview build changes only the hash, so listen for it.
    const onHash = () => {
      if (/^#(?:play)?\?/.test(window.location.hash)) read();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const shareQuery = encodeShare({
    eventId,
    dimension,
    mode,
    groups: mode === "turnout" ? [] : groups,
    turnout: mode === "turnout" ? turnout : {},
    and: andDim && andDim !== dimension && andGroups.length ? { dimension: andDim, groups: andGroups } : null,
    system,
  });
  useEffect(() => {
    if (!restored.current) return;
    const { pathname, search, hash } = window.location;
    let url: string;
    if (process.env.NEXT_PUBLIC_ARTIFACT) {
      // Only touch the hash while the play view is showing.
      if (hash && !/^#(?:play)?(?:\?|$)/.test(hash)) return;
      url = `${pathname}${search}#play?${shareQuery}`;
    } else {
      url = `${pathname}?${shareQuery}${hash}`;
    }
    if (url !== `${pathname}${search}${hash}`)
      window.history.replaceState(window.history.state, "", url);
  }, [shareQuery]);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (copied === "idle") return;
    const t = setTimeout(() => setCopied("idle"), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied("copied");
    } catch {
      setCopied(legacyCopy(url) ? "copied" : "failed");
    }
  };
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
        applyScenario(first.scenario);
        setPresetId(first.id);
      } else {
        applyScenario({ dimension: e.dimensions[0].id, mode, groups: [] });
        setPresetId(null);
      }
    } else {
      const has = (gs: { id: string }[], g: string) => gs.some((x) => x.id === g);
      const ok = groups.filter((g) => has(same.groups, g));
      const realRow = e.groupVoting[same.id]?.groups ?? {};
      const dials: Record<GroupId, number> = {};
      for (const [g, f] of Object.entries(turnout))
        if (has(same.groups, g))
          dials[g] = Math.min(f, maxTurnoutFactor(realRow[g]?.turnout));
      const sameAnd = e.dimensions.find((d) => d.id === andDim);
      const okAnd = sameAnd ? andGroups.filter((g) => has(sameAnd.groups, g)) : [];
      const next: Scenario = { dimension, mode, groups: ok, turnout: dials };
      if (sameAnd && okAnd.length) next.and = { dimension: sameAnd.id, groups: okAnd };
      applyScenario(next);
      if (!sameAnd) setAndDim(null);
      // Turnout presets differ by event (they copy that year's real turnout).
      setPresetId(matchPreset(e, next));
    }
  };
  const describe = () => {
    if (!scenario)
      return `Nobody's been left out yet, so this is just the real ${event.label}.`;
    const second = scenario.and
      ? dimensions.find((d) => d.id === scenario.and!.dimension)
      : undefined;
    const secondList = second
      ? joinNice(
          second.groups
            .filter((g) => scenario.and!.groups.includes(g.id))
            .map((g) => g.label),
          "or",
        )
      : "";
    if (mode === "turnout") {
      const real = event.groupVoting[dim.id]?.groups ?? {};
      const bits = dim.groups
        .filter((g) => (turnout[g.id] ?? 1) !== 1)
        .map((g) => {
          const f = turnout[g.id];
          const t = real[g.id]?.turnout;
          const pct = Math.round(f * 100);
          if (pct === 0) return `${g.label} stay home`;
          return typeof t === "number"
            ? `${g.label} at ${pct}% (${Math.round(f * t * 100)}% turnout)`
            : `${g.label} at ${pct}%`;
        });
      return `${dim.label} · 🎚️ Turnout dials: ${joinNice(bits)}${second ? `, only for ${second.label.toLowerCase()}: ${secondList}` : ""}.`;
    }
    const labels = dim.groups
      .filter((g) => groups.includes(g.id))
      .map((g) => g.label);
    if (second) {
      const a = `${dim.label}: ${joinNice(labels, "or")}`;
      const b = `${second.label}: ${secondList}`;
      return mode === "exclude"
        ? `🙅 Staying home: anyone who's both ${a} and ${b}…`
        : `☝️ Only voting: people who are both ${a} and ${b}…`;
    }
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
                  applyScenario(p.scenario);
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
              setTurnout({});
              if (andDim === d) {
                setAndDim(null);
                setAndGroups([]);
              }
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
            turnout={turnout}
            onDial={(g, f) => {
              setTurnout((t) => ({ ...t, [g]: f }));
              setPresetId(null);
            }}
            onResetDials={() => {
              setTurnout({});
              setPresetId(null);
            }}
            andDimension={andDim}
            andGroups={andGroups}
            onAndDimension={(d) => {
              setAndDim(d);
              setAndGroups([]);
              setPresetId(null);
            }}
            onToggleAndGroup={(g) => {
              setAndGroups((gs) =>
                gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g],
              );
              setPresetId(null);
            }}
          />
        </div>
      )}

      <div ref={resultsRef} className="scroll-mt-4 flex flex-col gap-2" id="results">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm font-bold text-muted">
            Send this what-if to the group chat:
          </span>
          <button
            type="button"
            onClick={copyLink}
            aria-live="polite"
            className={`chip px-3 py-1.5 text-sm font-extrabold ${copied === "copied" ? "bg-mint" : "bg-card hover:bg-sun"}`}
          >
            <span aria-hidden>🔗</span>{" "}
            {copied === "copied"
              ? "Copied!"
              : copied === "failed"
                ? "Couldn't copy. Copy the address bar instead."
                : "Copy link"}
          </button>
        </div>
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

const systemIds = systems.map((s) => s.id as string);

function joinNice(xs: string[], word = "and"): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} ${word} ${xs[xs.length - 1]}`;
}

/** The id of the preset (if any) that is exactly this scenario in this event. */
function matchPreset(e: ElectionEvent, s: Scenario): string | null {
  const key = (x: Scenario) =>
    encodeShare({
      eventId: e.id,
      dimension: x.dimension,
      mode: x.mode,
      groups: x.mode === "turnout" ? [] : [...x.groups].sort(),
      turnout: x.mode === "turnout" ? (x.turnout ?? {}) : {},
      and: x.and ? { dimension: x.and.dimension, groups: [...x.and.groups].sort() } : null,
      system: "fptp",
    });
  const k = key(s);
  return presetsFor(e).find((p) => key(p.scenario) === k)?.id ?? null;
}

/** Clipboard fallback for browsers (or sandboxed previews) without the async API. */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
