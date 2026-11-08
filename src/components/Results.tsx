import type {
  ElectionEvent,
  Party,
  PartyId,
  ScenarioResult,
} from "@/lib/types";
import { useState } from "react";
import { Hemicycle } from "./Hemicycle";
import { HexMap } from "./HexMap";
import {
  gallagher,
  systems,
  type Formation,
  type VotingSystem,
} from "@/lib/systems";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const pct0 = (x: number) =>
  x > 0 && x < 0.01 ? "<1%" : `${Math.round(x * 100)}%`;

export function Results({
  result,
  baseline,
  parties,
  event,
  description,
  isBaseline,
  system,
  onSystem,
  seats,
  formation,
  headline,
}: {
  result: ScenarioResult;
  baseline: ScenarioResult;
  parties: Party[];
  event: ElectionEvent;
  description: string;
  isBaseline: boolean;
  system: VotingSystem;
  onSystem: (s: VotingSystem) => void;
  seats: Record<PartyId, number>;
  formation: Formation;
  headline: string;
}) {
  const byId = new Map(parties.map((p) => [p.id, p]));
  const g = result.government;
  const shown = { ...result, seats };
  const sys = systems.find((x) => x.id === system)!;
  const [picked, setView] = useState<"map" | "commons" | null>(null);
  const view = picked ?? (system === "fptp" ? "map" : "commons");

  return (
    <section
      aria-labelledby="results-h"
      className="flex flex-col gap-5"
      aria-live="polite"
    >
      <div className="card relative overflow-hidden bg-sun p-5 sm:p-7">
        <p className="text-sm font-bold text-ink/70">{description}</p>
        <h2
          id="results-h"
          className="mt-1 font-display text-2xl font-black leading-tight sm:text-3xl"
        >
          {isBaseline && system === "fptp"
            ? `What actually happened in ${event.year}: ${headline}`
            : headline}
        </h2>
        <span
          aria-hidden
          className="pointer-events-none absolute -right-3 -top-4 rotate-12 text-7xl opacity-20 sm:text-8xl"
        >
          🗳️
        </span>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:p-5">
        <h3 className="font-display text-lg font-extrabold">
          Change the rules{" "}
          <span className="text-sm font-bold text-muted">
            (same votes, different way of counting)
          </span>
        </h3>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Voting system"
        >
          {systems.map((x) => (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={x.id === system}
              onClick={() => onSystem(x.id)}
              className={`chip px-3 py-1.5 text-sm font-extrabold ${x.id === system ? "bg-grape text-white" : "bg-card hover:bg-sun"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink/80">{sys.blurb}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-5 [&>*]:min-w-0">
        <div className="card flex flex-col gap-3 p-4 sm:p-5 md:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-extrabold">
              {view === "map" ? "Who wins where" : "The new House of Commons"}
            </h3>
            <div
              className="flex gap-1 rounded-full border-2 border-ink p-0.5 text-xs font-extrabold"
              role="tablist"
            >
              {(
                [
                  ["map", "🗺️ Map"],
                  ["commons", "🏛️ Commons"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`rounded-full px-2.5 py-1 ${view === v ? "bg-ink text-paper" : "hover:bg-sun"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {view === "map" && event.map ? (
            <>
              {system !== "fptp" && (
                <p className="rounded-2xl bg-sky/20 px-3 py-2 text-xs font-bold">
                  Heads up: the map shows who&apos;d win each constituency under
                  first past the post. Under {sys.label.toLowerCase()} there are
                  no constituency winners, so check the Commons tab for the
                  seats.
                </p>
              )}
              <HexMap
                map={event.map}
                seatResults={result.seatResults}
                baselineResults={baseline.seatResults}
                parties={parties}
                isBaseline={isBaseline}
              />
            </>
          ) : (
            <Hemicycle
              seats={seats}
              parties={parties}
              majorityNeeded={g.majorityNeeded}
              label="Seats under this scenario"
            />
          )}
          <Legend parties={parties} seats={seats} />
        </div>
        <No10Card
          result={result}
          seats={seats}
          formation={formation}
          system={system}
          byId={byId}
          keptShare={
            baseline.totalVotes > 0
              ? result.totalVotes / baseline.totalVotes
              : 0
          }
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
        <SeatTable
          result={shown}
          baseline={baseline}
          parties={parties}
          year={event.year}
        />
        {system === "fptp" ? (
          <Flips result={result} byId={byId} />
        ) : (
          <SeatsVsVotes seats={seats} result={result} parties={parties} />
        )}
      </div>
    </section>
  );
}

function Swatch({ colour }: { colour: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-ink/40"
      style={{ background: colour }}
    />
  );
}

function Legend({
  parties,
  seats,
}: {
  parties: Party[];
  seats: Record<PartyId, number>;
}) {
  const shown = parties.filter((p) => seats[p.id] > 0);
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm font-bold">
      {shown.map((p) => (
        <li key={p.id} className="flex items-center gap-1.5">
          <Swatch colour={p.colour} />
          {p.short} <span className="text-muted">{seats[p.id]}</span>
        </li>
      ))}
    </ul>
  );
}

function No10Card({
  result,
  seats,
  formation,
  byId,
  keptShare,
  system,
}: {
  result: ScenarioResult;
  seats: Record<PartyId, number>;
  formation: Formation;
  byId: Map<PartyId, Party>;
  keptShare: number;
  system: VotingSystem;
}) {
  const f = formation;
  const total = Object.values(seats).reduce((a, b) => a + b, 0) || 1;
  const odds = Object.entries(f.pmChance)
    .filter(([, c]) => c >= 0.005)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const leader = odds[0] ? byId.get(odds[0][0]) : undefined;
  const fair = gallagher(seats, result.voteShares);

  let title: string;
  let body: React.ReactNode;
  if (!leader) {
    title = "Larry the Cat is in charge now";
    body = (
      <p>
        With nobody voting there are no MPs. The cat has assumed control.
        Honestly, fair.
      </p>
    );
  } else if (f.majorityParty) {
    const s = seats[leader.id];
    const vs = result.voteShares[leader.id] ?? 0;
    title = `${leader.name} walk into No 10`;
    body = (
      <p>
        <b>{s}</b> seats ({pct(s / total)} of MPs) on <b>{pct(vs)}</b> of the
        vote.{" "}
        {vs < 0.5 ? (
          <>
            So {pct(1 - vs)} of voters backed someone else, and they still get
            to run the show.
          </>
        ) : (
          <>An actual majority of voters. Rare as hen&apos;s teeth.</>
        )}
      </p>
    );
  } else {
    title = "Hung parliament: who gets the keys?";
    body = (
      <>
        <p className="text-sm">
          Nobody has the <b>{f.workingMajority}</b> seats needed to win votes
          {seats.sf
            ? " (Sinn Féin don't take their seats, so the line is a bit lower)"
            : ""}
          . Odds of each party ending up with the PM:
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {odds.map(([id, c]) => {
            const p = byId.get(id);
            if (!p) return null;
            return (
              <li
                key={id}
                className="flex items-center gap-2 text-sm font-bold"
              >
                <span className="w-14 shrink-0 truncate">{p.short}</span>
                <span className="relative h-4 flex-1 overflow-hidden rounded-full bg-paper ring-1 ring-ink/20">
                  <span
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${c * 100}%`, background: p.colour }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums">
                  {pct0(c)}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-muted">
          Likeliest deals
        </p>
        <ol className="mt-1 flex flex-col gap-1 text-sm">
          {f.deals.slice(0, 3).map((d) => (
            <li
              key={d.parties.join("+") + d.minority}
              className="flex flex-wrap items-center gap-1.5"
            >
              {d.parties.map((id, i) => {
                const p = byId.get(id);
                return (
                  <span key={id} className="flex items-center gap-1">
                    {i > 0 && <span className="text-muted">+</span>}
                    {p && <Swatch colour={p.colour} />}
                    <b>{p?.short ?? id}</b>
                  </span>
                );
              })}
              <span className="text-muted">
                {d.minority ? "minority govt" : `= ${d.seats}`} ·{" "}
                {pct0(d.chance)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-1 text-xs text-muted">
          Based on who&apos;s willing to work with whom at the time. A toy
          guess, not a bookie&apos;s price.
        </p>
      </>
    );
  }

  return (
    <div
      className="card flex flex-col gap-2 p-4 sm:p-5 md:col-span-2"
      style={{ borderTop: `14px solid ${leader?.colour ?? "#1f1a3d"}` }}
    >
      <p className="text-xs font-extrabold uppercase tracking-wider text-muted">
        Who&apos;d be in No 10?
      </p>
      <div className="flex items-start gap-3">
        <span className="text-4xl" aria-hidden>
          {!leader ? "🐈" : f.majorityParty ? "🚪" : "🤝"}
        </span>
        <h3 className="font-display text-xl font-black leading-tight">
          {title}
        </h3>
      </div>
      <div className="text-[15px] leading-relaxed">{body}</div>
      <dl className="mt-auto grid grid-cols-2 gap-2 pt-3 text-center">
        <div className="rounded-2xl bg-paper p-2 ring-1 ring-ink/15">
          <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
            Votes counted
          </dt>
          <dd className="font-display text-xl font-black tabular-nums">
            {pct(keptShare)}
          </dd>
          <dd className="text-[11px] text-muted">of the real total</dd>
        </div>
        <div className="rounded-2xl bg-paper p-2 ring-1 ring-ink/15">
          <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
            Wonkiness score
          </dt>
          <dd className="font-display text-xl font-black tabular-nums">
            {fair.toFixed(1)}
          </dd>
          <dd className="text-[11px] text-muted">
            {fair < 5
              ? "pretty fair"
              : fair < 12
                ? "a bit lopsided"
                : "seats ≠ votes"}
            {system === "fptp" ? "" : ""}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Delta({ d }: { d: number }) {
  if (d === 0) return <span className="text-muted">–</span>;
  return (
    <span
      className={`inline-block min-w-9 rounded-full px-1.5 text-center text-xs font-extrabold ${
        d > 0 ? "bg-mint/60" : "bg-pink/25"
      }`}
    >
      {d > 0 ? `+${d}` : d}
    </span>
  );
}

function SeatTable({
  result,
  baseline,
  parties,
  year,
}: {
  result: ScenarioResult;
  baseline: ScenarioResult;
  parties: Party[];
  year: number;
}) {
  const rows = [...parties]
    .filter(
      (p) =>
        result.seats[p.id] > 0 ||
        baseline.seats[p.id] > 0 ||
        result.voteShares[p.id] > 0.005,
    )
    .sort(
      (a, b) =>
        result.seats[b.id] - result.seats[a.id] ||
        baseline.seats[b.id] - baseline.seats[a.id] ||
        result.voteShares[b.id] - result.voteShares[a.id],
    );
  return (
    <div className="card overflow-hidden p-0">
      <h3 className="px-4 pt-4 font-display text-lg font-extrabold sm:px-5">
        Scoreboard vs actual {year}
      </h3>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted">
            <th className="py-2 pl-4 font-extrabold sm:pl-5">Party</th>
            <th className="py-2 text-right font-extrabold">Seats</th>
            <th className="py-2 text-right font-extrabold">{year}</th>
            <th className="py-2 text-center font-extrabold">±</th>
            <th className="py-2 pr-4 text-right font-extrabold sm:pr-5">
              Votes
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const d = result.seats[p.id] - baseline.seats[p.id];
            const dv = result.voteShares[p.id] - baseline.voteShares[p.id];
            return (
              <tr key={p.id} className="border-t border-ink/10">
                <td className="py-2 pl-4 sm:pl-5">
                  <span className="flex items-center gap-2 font-bold">
                    <Swatch colour={p.colour} />
                    <span className="sm:hidden">{p.short}</span>
                    <span className="hidden sm:inline">{p.name}</span>
                  </span>
                </td>
                <td className="py-2 text-right font-black tabular-nums">
                  {result.seats[p.id]}
                </td>
                <td className="py-2 text-right tabular-nums text-muted">
                  {baseline.seats[p.id]}
                </td>
                <td className="py-2 text-center tabular-nums">
                  <Delta d={d} />
                </td>
                <td className="py-2 pr-4 text-right tabular-nums sm:pr-5">
                  {pct(result.voteShares[p.id])}
                  <span
                    className={`ml-1 hidden text-xs sm:inline ${dv >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {Math.abs(dv) >= 0.0005
                      ? `${dv > 0 ? "▲" : "▼"}${(Math.abs(dv) * 100).toFixed(1)}`
                      : ""}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SeatsVsVotes({
  seats,
  result,
  parties,
}: {
  seats: Record<PartyId, number>;
  result: ScenarioResult;
  parties: Party[];
}) {
  const total = Object.values(seats).reduce((a, b) => a + b, 0) || 1;
  const rows = [...parties]
    .filter(
      (p) => (result.voteShares[p.id] ?? 0) >= 0.01 || (seats[p.id] ?? 0) > 0,
    )
    .sort(
      (a, b) => (result.voteShares[b.id] ?? 0) - (result.voteShares[a.id] ?? 0),
    )
    .slice(0, 8);
  const max = Math.max(
    ...rows.map((p) =>
      Math.max(result.voteShares[p.id] ?? 0, (seats[p.id] ?? 0) / total),
    ),
    0.01,
  );
  return (
    <div className="card flex flex-col gap-3 p-4 sm:p-5">
      <h3 className="font-display text-lg font-extrabold">Seats vs votes</h3>
      <p className="text-xs text-muted">
        Top bar: share of the vote. Bottom bar: share of the seats.
      </p>
      <ul className="flex flex-col gap-2.5">
        {rows.map((p) => {
          const v = result.voteShares[p.id] ?? 0;
          const sh = (seats[p.id] ?? 0) / total;
          return (
            <li
              key={p.id}
              className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-x-2 text-sm"
            >
              <span className="row-span-2 truncate font-bold">{p.short}</span>
              <span
                className="h-2.5 rounded-full opacity-40"
                style={{ width: `${(v / max) * 100}%`, background: p.colour }}
              />
              <span className="text-right text-xs tabular-nums text-muted">
                {pct(v)}
              </span>
              <span
                className="h-2.5 rounded-full"
                style={{ width: `${(sh / max) * 100}%`, background: p.colour }}
              />
              <span className="text-right text-xs font-bold tabular-nums">
                {pct(sh)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Flips({
  result,
  byId,
}: {
  result: ScenarioResult;
  byId: Map<PartyId, Party>;
}) {
  const top = result.flipped.slice(0, 8);
  return (
    <div className="card flex flex-col gap-3 p-4 sm:p-5">
      <h3 className="font-display text-lg font-extrabold">
        Jaw-droppers{" "}
        <span className="text-sm font-bold text-muted">
          ({result.flipped.length} seat{result.flipped.length === 1 ? "" : "s"}{" "}
          change hands)
        </span>
      </h3>
      {top.length === 0 ? (
        <p className="text-sm text-muted">
          Not a single seat changes hands. Stubborn lot, aren&apos;t we?
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {top.map((f) => {
            const from = byId.get(f.from)!;
            const to = byId.get(f.to)!;
            return (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2 ring-1 ring-ink/15"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{f.name}</p>
                  <p className="text-xs text-muted">
                    {f.region} · was a {pct(f.originalMargin)} majority
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs font-extrabold">
                  <PartyPill p={from} />
                  <span aria-label="to">→</span>
                  <PartyPill p={to} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {result.flipped.length > top.length && (
        <p className="text-xs text-muted">
          …plus {result.flipped.length - top.length} more.
        </p>
      )}
    </div>
  );
}

function PartyPill({ p }: { p: Party }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 ring-1 ring-ink/30"
      style={{ background: p.colour, color: textOn(p.colour) }}
    >
      {p.short}
    </span>
  );
}

/** Pick black or white text for a hex background. */
function textOn(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#1f1a3d";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? "#1f1a3d" : "#ffffff";
}
