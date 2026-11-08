"use client";

import { useEffect, useState } from "react";
import type { ModelInput } from "@/lib/engine";
import { hasTacticalData, TACTICAL, type VotingSystem } from "@/lib/systems";
import type { ElectionEvent, Party, PartyId, Scenario } from "@/lib/types";
import { SMALL_SAMPLE, startUncertainty, type Uncertainty } from "@/lib/uncertainty";

const cache = new Map<string, Uncertainty>();

/**
 * Noisy re-runs of the current scenario, worked out a couple at a time in the background so the
 * page stays snappy. Returns the latest summary (it fills in over a second or two) and whether
 * it's finished.
 */
export function useUncertainty(
  eventId: string,
  input: ModelInput,
  scenario: Scenario | null,
  system: VotingSystem,
  tactical: boolean,
): { u: Uncertainty | null; busy: boolean } {
  const key = scenario
    ? `${eventId}|${scenario.dimension}|${scenario.mode}|${[...scenario.groups].sort().join(",")}|${system}|${tactical ? 1 : 0}`
    : "";
  const [state, setState] = useState<{ key: string; u: Uncertainty | null; busy: boolean }>({
    key: "",
    u: null,
    busy: false,
  });
  useEffect(() => {
    if (!key || cache.has(key)) return;
    const run = startUncertainty(input, scenario, {
      system,
      tacticalEventId: tactical ? eventId : null,
    });
    if (!run) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const finished = run.step(2);
      const u = run.result();
      if (finished && u) cache.set(key, u);
      setState({ key, u, busy: !finished });
      if (!finished) timer = setTimeout(tick, 16);
    };
    // Wait a beat so clicking through groups quickly doesn't queue up work.
    timer = setTimeout(tick, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` captures everything about the inputs that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!key) return { u: null, busy: false };
  const cached = cache.get(key);
  if (cached) return { u: cached, busy: false };
  return state.key === key ? { u: state.u, busy: state.busy } : { u: null, busy: true };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const seatsTxt = (n: number) => `${Math.round(n)}`;

/** Kept groups whose poll sample is small. */
function shakyGroups(event: ElectionEvent, scenario: Scenario | null) {
  if (!scenario) return [];
  const d = event.groupVoting[scenario.dimension];
  const dim = event.dimensions.find((x) => x.id === scenario.dimension);
  if (!d || !dim) return [];
  const chosen = new Set(scenario.groups);
  return dim.groups
    .filter((g) => (scenario.mode === "only" ? chosen.has(g.id) : !chosen.has(g.id)))
    .map((g) => ({ label: g.label, n: d.groups[g.id]?.n }))
    .filter((g): g is { label: string; n: number } => g.n !== undefined && g.n < SMALL_SAMPLE);
}

/** One or two lines under the headline: how much the answer could move with poll noise. */
export function HowSure({
  u,
  busy,
  event,
  scenario,
  seats,
  majorityParty,
}: {
  u: Uncertainty | null;
  busy: boolean;
  event: ElectionEvent;
  scenario: Scenario | null;
  /** Central seats under the chosen system (general elections). */
  seats?: Record<PartyId, number>;
  /** Party with a majority in the central result, if any. */
  majorityParty?: PartyId | null;
}) {
  if (!scenario) return null;
  const name = (id: PartyId) => event.parties.find((p) => p.id === id)?.name ?? id;
  const shaky = shakyGroups(event, scenario);
  let line: string;
  if (!u) {
    line = "Working out how much this could wobble…";
  } else if (event.kind === "referendum") {
    const [a, b] = event.parties;
    const win = (u.shares[a.id]?.mid ?? 0) >= (u.shares[b.id]?.mid ?? 0) ? a : b;
    const r = u.shares[win.id];
    const chance = u.wins[win.id] ?? 0;
    line =
      `${win.name} gets ${pct(r.lo)} to ${pct(r.hi)} in 8 out of 10 re-runs, and wins ` +
      (chance >= 0.995 ? "every one of them." : `${pct(chance)} of them.`);
  } else {
    const ranked = Object.entries(u.majority).sort((x, y) => y[1] - x[1]);
    const top = majorityParty ?? ranked[0]?.[0];
    const lead = top ? (u.majority[top] ?? 0) : 0;
    const largest =
      seats &&
      Object.entries(seats)
        .filter(([p]) => p !== "spk")
        .sort((x, y) => y[1] - x[1])[0]?.[0];
    if (top && lead >= 0.995) line = `${name(top)} win a majority in every re-run.`;
    else if (top && lead > 0)
      line = `${name(top)} win a majority in ${pct(lead)} of re-runs; ${pct(u.hung)} end up hung.`;
    else if (largest) {
      const r = u.seats[largest];
      line = `Hung in every re-run. ${name(largest)} get ${seatsTxt(r.lo)} to ${seatsTxt(r.hi)} seats in 8 out of 10.`;
    } else line = "";
  }
  return (
    <div className="mt-3 flex flex-col gap-1 text-sm">
      <p className="font-bold text-ink/80">
        <span className="font-extrabold">How sure are we?</span> {line}
        {u && busy && <span className="text-muted"> (still counting: {u.runs} re-runs so far)</span>}
      </p>
      {shaky.length > 0 && (
        <p className="font-bold text-rose-800">
          <span aria-hidden>⚠️ </span>
          Small sample:{" "}
          {shaky.map((g) => `${g.label} (${g.n} people)`).join(", ")}. The poll only asked a handful, so take
          this with a big pinch of salt.
        </p>
      )}
    </div>
  );
}

/** "Lab 380–420 seats" for the main parties, next to the scoreboard. */
export function SeatRanges({
  u,
  busy,
  parties,
  seats,
}: {
  u: Uncertainty | null;
  busy: boolean;
  parties: Party[];
  seats: Record<PartyId, number>;
}) {
  if (!u) return null;
  const rows = parties
    .filter((p) => (u.seats[p.id]?.hi ?? 0) >= 1 && p.id !== "spk")
    .sort((a, b) => (seats[b.id] ?? 0) - (seats[a.id] ?? 0))
    .slice(0, 8);
  return (
    <div className="card flex flex-col gap-2 p-4 sm:p-5">
      <h3 className="font-display text-lg font-extrabold">
        Likely range{" "}
        <span className="text-sm font-bold text-muted">
          (8 out of 10 re-runs land in here{busy ? ", still counting" : ""})
        </span>
      </h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-bold">
        {rows.map((p) => {
          const r = u.seats[p.id];
          const lo = Math.round(r.lo);
          const hi = Math.round(r.hi);
          return (
            <li key={p.id} className="flex items-center gap-1.5 tabular-nums">
              <span
                aria-hidden
                className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-ink/40"
                style={{ background: p.colour }}
              />
              {p.short} {lo === hi ? lo : `${lo}–${hi}`} seats
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">
        We re-ran this scenario {u.runs} times, each time redrawing every group&apos;s vote from its poll&apos;s
        sample size. It only covers polling noise, not the model&apos;s other guesses.
      </p>
    </div>
  );
}

/** Switch for undoing tactical votes under PR. */
export function TacticalToggle({
  eventId,
  on,
  onChange,
}: {
  eventId: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  if (!hasTacticalData(eventId)) {
    return (
      <p className="text-xs font-bold text-muted">
        Tactical votes are counted as cast: we haven&apos;t found a poll that says where this election&apos;s
        tactical voters would otherwise have gone.
      </p>
    );
  }
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-2xl bg-sky/20 px-3 py-2 text-sm">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-grape"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <b>Undo tactical voting.</b> Under PR there&apos;s less reason to vote for a second choice to keep
        another party out, so some people would vote differently. {TACTICAL[eventId].summary} (YouGov poll; see How it works.)
      </span>
    </label>
  );
}

/** Tiny warning on a group chip when its poll sample is under 100 people. */
export function SmallSampleFlag({ n }: { n?: number }) {
  if (n === undefined || n >= SMALL_SAMPLE) return null;
  return (
    <span
      className="rounded-full bg-rose-100 px-1.5 text-[11px] font-extrabold text-rose-800 no-underline"
      title={`Small sample: the poll only asked ${n} people in this group, so its figures are shaky.`}
    >
      ⚠️ n={n}
    </span>
  );
}
