"use client";

import { useId, useMemo, useState } from "react";
import { butlerSwing } from "@/lib/engine";
import { searchSeats, seatVoterMix } from "@/lib/mapModes";
import type { ElectionEvent, Party, PartyId, ScenarioResult, SeatResult } from "@/lib/types";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const pts = (x: number) => `${(Math.abs(x) * 100).toFixed(1)} points`;

/**
 * Type a seat (or counting area) and see what the current scenario does there.
 * `selected` is a seat id; the parent keeps it so the hex map can highlight it too.
 */
export function SeatSearch({
  event,
  result,
  baseline,
  parties,
  selected,
  onSelect,
  areaWord = "constituency",
  isBaseline,
}: {
  event: ElectionEvent;
  result: ScenarioResult;
  baseline: ScenarioResult;
  parties: Party[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  areaWord?: string;
  isBaseline: boolean;
}) {
  const uid = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = useMemo(() => searchSeats(event.constituencies, q), [event.constituencies, q]);
  const showList = open && matches.length > 0;

  const choose = (id: string) => {
    onSelect(id);
    setQ("");
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (showList && matches[active]) {
        e.preventDefault();
        choose(matches[active].id);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const seat = selected ? event.constituencies.find((c) => c.id === selected) : undefined;
  const after = seat ? result.seatResults.find((s) => s.id === seat.id) : undefined;
  const before = seat ? baseline.seatResults.find((s) => s.id === seat.id) : undefined;
  const listId = `${uid}-list`;

  return (
    <div className="card flex flex-col gap-3 p-4 sm:p-5">
      <h3 className="font-display text-lg font-extrabold">Look up a {areaWord}</h3>
      <div className="relative">
        <label htmlFor={`${uid}-q`} className="sr-only">
          Search for a {areaWord}
        </label>
        <input
          id={`${uid}-q`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${uid}-opt-${active}` : undefined}
          autoComplete="off"
          placeholder={`Start typing a ${areaWord} name…`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKey}
          className="w-full rounded-full border-2 border-ink bg-paper px-4 py-2 text-base font-bold outline-none focus-visible:ring-4 focus-visible:ring-sky/60"
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label={`Matching ${areaWord}s`}
            className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-[var(--shadow-chunky-sm)]"
          >
            {matches.map((c, i) => (
              <li
                key={c.id}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(c.id);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-4 py-2 text-sm ${i === active ? "bg-sun" : ""}`}
              >
                <b>{c.name}</b> <span className="text-muted">· {c.region}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {seat && before && after ? (
        <SeatDetail
          event={event}
          result={result}
          seatName={seat.name}
          region={seat.region}
          before={before}
          after={after}
          parties={parties}
          isBaseline={isBaseline}
          onClear={() => onSelect(null)}
        />
      ) : (
        <p className="text-sm text-muted">
          Pick a {areaWord} to see its real result next to this scenario. You can also tap a hexagon on the map.
        </p>
      )}
    </div>
  );
}

function SeatDetail({
  event,
  result,
  seatName,
  region,
  before,
  after,
  parties,
  isBaseline,
  onClear,
}: {
  event: ElectionEvent;
  result: ScenarioResult;
  seatName: string;
  region: string;
  before: SeatResult;
  after: SeatResult;
  parties: Party[];
  isBaseline: boolean;
  onClear: () => void;
}) {
  const byId = new Map(parties.map((p) => [p.id, p]));
  const name = (id: PartyId | null) => (id ? (byId.get(id)?.name ?? id) : "nobody");
  const share = (r: SeatResult, p: PartyId) => (r.totalVotes > 0 ? (r.votes[p] ?? 0) / r.totalVotes : 0);
  const rows = parties
    .filter((p) => share(before, p.id) >= 0.01 || share(after, p.id) >= 0.01)
    .sort((a, b) => share(after, b.id) - share(after, a.id));
  const max = Math.max(0.01, ...rows.map((p) => Math.max(share(before, p.id), share(after, p.id))));

  // Swing from the real winner to the scenario winner, or to the real runner-up if nothing changes.
  const realOrder = Object.entries(before.votes).sort((a, b) => b[1] - a[1]);
  const from = before.winner;
  const to = after.winner && after.winner !== from ? after.winner : (realOrder[1]?.[0] ?? null);
  const swing = from && to ? butlerSwing(before, after, from, to) : 0;
  const flipped = after.winner !== before.winner;

  const dimension = result.scenario?.dimension ?? event.dimensions[0]?.id;
  const seat = event.constituencies.find((c) => c.id === before.id)!;
  const mix = dimension ? seatVoterMix(event, seat, dimension, result.scenario) : null;
  const dimLabel = event.dimensions.find((d) => d.id === dimension)?.label ?? "";
  const mixMax = mix ? Math.max(0.01, ...mix.rows.map((r) => Math.max(r.local, r.national))) : 1;

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-xl font-black leading-tight">{seatName}</p>
          <p className="text-xs font-bold text-muted">{region}</p>
        </div>
        <button type="button" onClick={onClear} className="chip bg-card px-2.5 py-0.5 text-xs font-extrabold hover:bg-sun">
          Clear
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm [&>*]:min-w-0">
        <div className="rounded-2xl bg-paper px-3 py-2 ring-1 ring-ink/15">
          <dt className="text-xs font-bold text-muted">Real result</dt>
          <dd className="font-extrabold">
            {name(before.winner)} <span className="font-bold text-muted">by {pct(before.margin)}</span>
          </dd>
        </div>
        <div className={`rounded-2xl px-3 py-2 ring-1 ring-ink/15 ${flipped ? "bg-sun" : "bg-paper"}`}>
          <dt className="text-xs font-bold text-muted">{isBaseline ? "This scenario (no change yet)" : "This scenario"}</dt>
          <dd className="font-extrabold">
            {name(after.winner)} <span className="font-bold text-muted">by {pct(after.margin)}</span>
            {flipped && <span className="ml-1 text-xs">(changes hands)</span>}
          </dd>
        </div>
      </dl>

      {!isBaseline && from && to && (
        <p className="text-sm">
          {Math.abs(swing) < 0.0005 ? (
            <>No swing between {byId.get(from)?.short ?? from} and {byId.get(to)?.short ?? to}.</>
          ) : (
            <>
              A <b>{pts(swing)}</b> Butler swing from <b>{byId.get(swing > 0 ? from : to)?.short}</b> to{" "}
              <b>{byId.get(swing > 0 ? to : from)?.short}</b>.
            </>
          )}
        </p>
      )}

      <div>
        <p className="mb-1 text-xs text-muted">Vote share. Faint bar: real result. Solid bar: this scenario.</p>
        <ul className="flex flex-col gap-1.5">
          {rows.map((p) => {
            const b = share(before, p.id);
            const a = share(after, p.id);
            const d = a - b;
            return (
              <li key={p.id} className="grid grid-cols-[3.5rem_1fr_4.75rem] items-center gap-x-2 text-sm">
                <span className="row-span-2 truncate font-bold">{p.short}</span>
                <span className="h-2 rounded-full opacity-35" style={{ width: `${(b / max) * 100}%`, background: p.colour }} />
                <span className="text-right text-xs tabular-nums text-muted">{pct(b)}</span>
                <span className="h-2 rounded-full" style={{ width: `${(a / max) * 100}%`, background: p.colour }} />
                <span className="text-right text-xs font-bold tabular-nums">
                  {pct(a)}
                  {!isBaseline && Math.abs(d) >= 0.0005 && (
                    <span className={d > 0 ? "text-emerald-700" : "text-rose-700"}>
                      {" "}
                      {d > 0 ? "▲" : "▼"}
                      {(Math.abs(d) * 100).toFixed(1)}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {mix && (
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-muted">
            Who votes here: {dimLabel.toLowerCase()}
          </p>
          <p className="mb-1.5 text-xs text-muted">
            {mix.local
              ? "Bar: this seat's estimated voter mix (from the Census). Tick: the national mix."
              : "No local Census mix for this one, so this is the national voter mix."}
            {result.scenario?.dimension === dimension ? " Greyed-out groups aren't voting in this scenario." : ""}
          </p>
          <ul className="flex flex-col gap-1">
            {mix.rows.map((r) => (
              <li
                key={r.id}
                className={`grid grid-cols-[minmax(0,8.5rem)_1fr_3rem] items-center gap-x-2 text-xs ${r.kept ? "" : "opacity-40"}`}
              >
                <span className={`truncate font-bold ${r.kept ? "" : "line-through"}`}>
                  <span aria-hidden>{r.emoji}</span> {r.label}
                </span>
                <span className="relative h-2.5 rounded-full bg-paper ring-1 ring-ink/15">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-grape" style={{ width: `${(r.local / mixMax) * 100}%` }} />
                  {mix.local && (
                    <span
                      aria-hidden
                      className="absolute -inset-y-0.5 w-0.5 bg-ink"
                      style={{ left: `${(r.national / mixMax) * 100}%` }}
                    />
                  )}
                </span>
                <span className="text-right tabular-nums">{pct(r.local)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
