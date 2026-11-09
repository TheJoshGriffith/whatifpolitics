"use client";

import { useRef, useState } from "react";
import type { Model } from "@/lib/engine";
import type { VotingSystem } from "@/lib/systems";
import {
  bestTippingPoints,
  outcomeOf,
  tippingForGroup,
  tippingJobs,
  type Outcome,
  type TippingPoint,
} from "@/lib/tipping";
import type { ElectionEvent, Scenario } from "@/lib/types";

type Found = { gov: TippingPoint[]; opp: TippingPoint[] };

/** "What's the smallest nudge that changes the result?" for the vote on screen. */
export function TippingPoints({
  event,
  model,
  system,
  onTry,
}: {
  event: ElectionEvent;
  model: Model;
  system: VotingSystem;
  onTry: (s: Scenario) => void;
}) {
  const [found, setFound] = useState<Found | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const run = useRef(0);
  const general = event.kind === "general";
  const sysForSearch: VotingSystem = general ? system : "fptp";

  // The parent remounts this per vote and counting rule (key), which resets the results.
  const start = () => {
    const id = ++run.current;
    const jobs = tippingJobs(event);
    const base = outcomeOf(event, model.baseline, sysForSearch);
    const gov: TippingPoint[] = [];
    const opp: TippingPoint[] = [];
    let i = 0;
    setProgress(0);
    // A few groups at a time, so the page stays responsive while it crunches.
    const step = () => {
      if (id !== run.current) return;
      const until = performance.now() + 40;
      while (i < jobs.length && performance.now() < until) {
        const [d, g] = jobs[i++];
        gov.push(...tippingForGroup(model, event, d, g, sysForSearch, "government", base));
        if (general) opp.push(...tippingForGroup(model, event, d, g, sysForSearch, "opposition", base));
      }
      setProgress(i / jobs.length);
      if (i < jobs.length) setTimeout(step, 0);
      else {
        // Opposition changes that are really government changes are listed once, up top.
        const oppOnly = opp.filter((p) => p.outcome.key === base.key && p.outcome.second);
        setFound({ gov: bestTippingPoints(gov, 4), opp: bestTippingPoints(oppOnly, 3) });
        setProgress(null);
      }
    };
    setTimeout(step, 0);
  };

  const base = outcomeOf(event, model.baseline, sysForSearch);
  const pname = (id: string | null) => event.parties.find((p) => p.id === id)?.name ?? "Nobody";

  return (
    <section aria-labelledby="tipping-h" className="card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="tipping-h" className="font-display text-lg font-extrabold">
          🔍 Tipping points
        </h2>
        {progress === null && (
          <button type="button" onClick={start} className="chip bg-sun px-3 py-1.5 text-sm font-extrabold hover:bg-mint">
            {found ? "Run it again" : "Find them"}
          </button>
        )}
      </div>
      <p className="text-sm text-ink/80">
        What&apos;s the smallest change in one group&apos;s turnout that would have changed{" "}
        {general ? "who governs" : "the result"} in the {event.label}? We try every group, from a few of them staying
        home to everyone extra the turnout dial allows, and keep the smallest nudges.
        {general && system !== "fptp" && " This uses the counting rules you've picked above."}
      </p>
      {progress !== null && (
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-card">
            <div className="h-full bg-grape transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums text-muted">Crunching… {Math.round(progress * 100)}%</span>
        </div>
      )}
      {found && (
        <>
          {found.gov.length === 0 ? (
            <p className="rounded-2xl bg-mint/30 px-3 py-2 text-sm font-bold">
              Rock solid. No single group, staying home or turning out in force, changes{" "}
              {general ? "who governs" : "the winner"} here.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {found.gov.map((p) => (
                <TipCard key={`${p.dimension}/${p.group}/${p.factor}`} p={p} event={event} onTry={onTry}>
                  {describeOutcome(base, p.outcome, pname, general)}
                </TipCard>
              ))}
            </ul>
          )}
          {found.opp.length > 0 && (
            <>
              <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-muted">
                Smaller shake-ups: same government, new runner-up
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {found.opp.map((p) => (
                  <TipCard key={`o/${p.dimension}/${p.group}/${p.factor}`} p={p} event={event} onTry={onTry}>
                    {pname(p.outcome.second)} come second, ahead of {pname(base.second)}.
                  </TipCard>
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-muted">
            One group at a time, with everyone else voting as they really did. The model behind it is the same
            back-of-the-fag-packet one as the rest of the site, so small nudges are the least certain.
          </p>
        </>
      )}
    </section>
  );
}

function TipCard({
  p,
  event,
  onTry,
  children,
}: {
  p: TippingPoint;
  event: ElectionEvent;
  onTry: (s: Scenario) => void;
  children: React.ReactNode;
}) {
  const dim = event.dimensions.find((d) => d.id === p.dimension);
  const group = dim?.groups.find((g) => g.id === p.group);
  return (
    <li className="flex flex-col gap-1.5 rounded-2xl border-2 border-ink bg-paper p-3">
      <span className="self-start rounded-full bg-sky/30 px-2 py-0.5 text-xs font-extrabold">
        {group?.emoji} {dim?.label}: {group?.label}
      </span>
      <p className="text-sm">
        <b>{change(p.factor)}</b>{" "}
        <span className="text-muted">({pct(p.moved)} of everyone who really voted)</span>
      </p>
      <p className="text-sm font-extrabold">→ {children}</p>
      <button
        type="button"
        onClick={() => onTry(p.scenario)}
        className="chip self-start bg-card px-2.5 py-1 text-xs font-extrabold hover:bg-sun"
      >
        Try it
      </button>
    </li>
  );
}

/** "If 3% of them had stayed home" / "If 21% more of them had turned out". */
export function change(factor: number): string {
  const d = Math.abs(1 - factor) * 100;
  const n = d >= 10 ? Math.round(d) : Math.round(d * 10) / 10;
  if (factor >= 1) return `If ${n}% more of them had turned out`;
  if (factor <= 0) return "If every one of them had stayed home";
  return `If ${n}% of them had stayed home`;
}

function pct(x: number): string {
  const p = x * 100;
  return `${p >= 10 ? Math.round(p) : p < 0.1 ? "under 0.1" : p.toFixed(1)}%`;
}

export function describeOutcome(
  base: Outcome,
  now: Outcome,
  pname: (id: string | null) => string,
  general: boolean,
): string {
  if (!general) return `${pname(now.party)} wins.`;
  if (now.majority) return `${pname(now.party)} win a majority.`;
  if (now.party === null) return "A hung parliament, with a dead heat for first place.";
  if (base.majority && base.party === now.party)
    return `${pname(now.party)} fall short of a majority. Hung parliament.`;
  return `A hung parliament, with ${pname(now.party)} the largest party.`;
}
