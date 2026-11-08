import type { ElectionEvent, ScenarioResult } from "@/lib/types";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Headline for a two-option referendum. */
export function referendumHeadline(result: ScenarioResult, baseline: ScenarioResult, event: ElectionEvent): string {
  const [a, b] = event.parties;
  const sa = result.voteShares[a.id] ?? 0;
  const sb = result.voteShares[b.id] ?? 0;
  const win = sa >= sb ? a : b;
  const ws = Math.max(sa, sb);
  const realWin = (baseline.voteShares[a.id] ?? 0) >= (baseline.voteShares[b.id] ?? 0) ? a : b;
  const gap = Math.abs(sa - sb);
  const place = event.id === "indyref2014" ? "Scotland" : "Britain";
  if (win.id !== realWin.id) {
    return gap < 0.01
      ? `${win.name} sneaks it with ${pct(ws)}! History rewritten by a whisker.`
      : `${win.name} wins with ${pct(ws)}! That's a very different ${place}.`;
  }
  if (gap < 0.02) return `${win.name} still wins, but only just: ${pct(ws)}. Squeaky bum time.`;
  return `${win.name} still wins, with ${pct(ws)}. Same answer, different maths.`;
}

export function ReferendumResults({
  result,
  baseline,
  event,
  description,
  isBaseline,
}: {
  result: ScenarioResult;
  baseline: ScenarioResult;
  event: ElectionEvent;
  description: string;
  isBaseline: boolean;
}) {
  const [a, b] = event.parties;
  const byId = new Map(event.parties.map((p) => [p.id, p]));
  const areaWord = event.id === "indyref2014" ? "council" : "counting area";
  const keptShare = baseline.totalVotes > 0 ? result.totalVotes / baseline.totalVotes : 0;
  const flips = result.flipped.slice(0, 8);

  return (
    <section aria-labelledby="results-h" className="flex flex-col gap-5" aria-live="polite">
      <div className="card relative overflow-hidden bg-sun p-5 sm:p-7">
        <p className="text-sm font-bold text-ink/70">{description}</p>
        <h2 id="results-h" className="mt-1 font-display text-2xl font-black leading-tight sm:text-3xl">
          {isBaseline
            ? `Here's what actually happened in ${event.year}.`
            : referendumHeadline(result, baseline, event)}
        </h2>
        <span aria-hidden className="pointer-events-none absolute -right-3 -top-4 rotate-12 text-7xl opacity-20 sm:text-8xl">
          ✉️
        </span>
      </div>

      <div className="card flex flex-col gap-4 p-4 sm:p-5">
        <h3 className="font-display text-lg font-extrabold">The count</h3>
        <SplitBar label="This scenario" result={result} a={a} b={b} />
        <SplitBar label={`Actual ${event.year}`} result={baseline} a={a} b={b} muted />
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 [&>*]:min-w-0">
          <Stat k={`${a.name} ${areaWord}s`} v={`${result.seats[a.id] ?? 0}`} was={baseline.seats[a.id] ?? 0} />
          <Stat k={`${b.name} ${areaWord}s`} v={`${result.seats[b.id] ?? 0}`} was={baseline.seats[b.id] ?? 0} />
          <Stat k="Votes cast" v={Math.round(result.totalVotes).toLocaleString("en-GB")} />
          <Stat k="Share of real voters left" v={pct(keptShare)} />
        </dl>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:p-5">
        <h3 className="font-display text-lg font-extrabold">
          Areas that flip{" "}
          <span className="text-sm font-bold text-muted">
            ({result.flipped.length} {areaWord}
            {result.flipped.length === 1 ? "" : "s"} change sides)
          </span>
        </h3>
        {flips.length === 0 ? (
          <p className="text-sm text-muted">Every area sticks with its real answer. Stubborn lot.</p>
        ) : (
          <ol className="grid gap-2 sm:grid-cols-2">
            {flips.map((f) => {
              const to = byId.get(f.to)!;
              return (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2 ring-1 ring-ink/15">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{f.name}</p>
                    <p className="text-xs text-muted">
                      {f.region} · really went {byId.get(f.from)!.name} by {pct(f.originalMargin)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-extrabold text-white ring-1 ring-ink/30"
                    style={{ background: to.colour }}
                  >
                    → {to.short}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {result.flipped.length > flips.length && (
          <p className="text-xs text-muted">…plus {result.flipped.length - flips.length} more.</p>
        )}
        <p className="text-xs text-muted">
          Referendums are won on the national count, not by areas. The area tally is just for fun.
        </p>
      </div>
    </section>
  );
}

function SplitBar({
  label,
  result,
  a,
  b,
  muted,
}: {
  label: string;
  result: ScenarioResult;
  a: { id: string; name: string; colour: string };
  b: { id: string; name: string; colour: string };
  muted?: boolean;
}) {
  const sa = result.voteShares[a.id] ?? 0;
  const sb = result.voteShares[b.id] ?? 0;
  return (
    <div className={muted ? "opacity-60" : ""}>
      <div className="mb-1 flex justify-between text-sm font-extrabold">
        <span style={{ color: a.colour }}>
          {a.name} {pct(sa)}
        </span>
        <span className="text-xs font-bold text-muted">{label}</span>
        <span style={{ color: b.colour }}>
          {pct(sb)} {b.name}
        </span>
      </div>
      <div
        className="relative flex h-7 overflow-hidden rounded-full ring-2 ring-ink"
        role="img"
        aria-label={`${label}: ${a.name} ${pct(sa)}, ${b.name} ${pct(sb)}`}
      >
        <div style={{ width: `${sa * 100}%`, background: a.colour }} />
        <div style={{ width: `${sb * 100}%`, background: b.colour }} />
        <div aria-hidden className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-ink" />
      </div>
    </div>
  );
}

function Stat({ k, v, was }: { k: string; v: string; was?: number }) {
  return (
    <div className="rounded-2xl bg-paper px-3 py-2 ring-1 ring-ink/15">
      <dt className="text-xs font-bold text-muted">{k}</dt>
      <dd className="font-display text-xl font-black tabular-nums">
        {v}
        {was !== undefined && <span className="ml-1 text-xs font-bold text-muted">(really {was})</span>}
      </dd>
    </div>
  );
}
