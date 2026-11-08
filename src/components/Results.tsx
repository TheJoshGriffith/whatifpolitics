import type { Party, PartyId, ScenarioResult } from "@/lib/types";
import { Hemicycle } from "./Hemicycle";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function Results({
  result,
  baseline,
  parties,
  description,
  isBaseline,
}: {
  result: ScenarioResult;
  baseline: ScenarioResult;
  parties: Party[];
  description: string;
  isBaseline: boolean;
}) {
  const byId = new Map(parties.map((p) => [p.id, p]));
  const g = result.government;

  return (
    <section aria-labelledby="results-h" className="flex flex-col gap-5" aria-live="polite">
      <div className="card relative overflow-hidden bg-sun p-5 sm:p-7">
        <p className="text-sm font-bold text-ink/70">{description}</p>
        <h2 id="results-h" className="mt-1 font-display text-2xl font-black leading-tight sm:text-3xl">
          {isBaseline ? "Here's what actually happened in 2024." : result.headline}
        </h2>
        <span aria-hidden className="pointer-events-none absolute -right-3 -top-4 rotate-12 text-7xl opacity-20 sm:text-8xl">
          🗳️
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-5">
        <div className="card flex flex-col gap-3 p-4 sm:p-5 md:col-span-3">
          <h3 className="font-display text-lg font-extrabold">The new House of Commons</h3>
          <Hemicycle
            seats={result.seats}
            parties={parties}
            majorityNeeded={g.majorityNeeded}
            label="Seats under this scenario"
          />
          <Legend parties={parties} seats={result.seats} />
        </div>
        <No10Card
          result={result}
          byId={byId}
          keptShare={baseline.totalVotes > 0 ? result.totalVotes / baseline.totalVotes : 0}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <SeatTable result={result} baseline={baseline} parties={parties} />
        <Flips result={result} byId={byId} />
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

function Legend({ parties, seats }: { parties: Party[]; seats: Record<PartyId, number> }) {
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
  byId,
  keptShare,
}: {
  result: ScenarioResult;
  byId: Map<PartyId, Party>;
  keptShare: number;
}) {
  const g = result.government;
  const party = g.largestParty ? byId.get(g.largestParty) : undefined;

  let title: string;
  let body: React.ReactNode;
  if (!party) {
    title = "Larry the Cat is in charge now";
    body = <p>With nobody voting there are no MPs. The cat has assumed control. Honestly, fair.</p>;
  } else if (g.hasMajority) {
    title = `${party.name} walk into No 10`;
    body = (
      <p>
        <b>{g.largestPartySeats}</b> seats — a majority of <b>{g.majority}</b>. No deals, no drama,
        no awkward rose-garden press conference.
      </p>
    );
  } else {
    title = `${party.name} are biggest… but stuck`;
    const deal = g.possibleDeal?.map((id) => byId.get(id)!).filter(Boolean) ?? [];
    const dealSeats = deal.reduce((a, p) => a + result.seats[p.id], 0);
    body = (
      <>
        <p>
          <b>{g.largestPartySeats}</b> seats, <b>{g.majorityNeeded - g.largestPartySeats}</b> short
          of the magic {g.majorityNeeded}.
        </p>
        {deal.length > 1 && (
          <div className="mt-3 rounded-2xl bg-paper p-3 text-sm ring-2 ring-ink">
            <p className="font-extrabold">Smallest deal that adds up:</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5">
              {deal.map((p, i) => (
                <span key={p.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted">+</span>}
                  <Swatch colour={p.colour} />
                  <b>{p.short}</b>
                </span>
              ))}
              <span className="text-muted">= {dealSeats}</span>
            </p>
            <p className="mt-1 text-xs text-muted">Maths, not friendships. Some of these lot would rather eat a hat.</p>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className="card flex flex-col gap-2 p-4 sm:p-5 md:col-span-2"
      style={{ borderTop: `14px solid ${party?.colour ?? "#1f1a3d"}` }}
    >
      <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Who&apos;d be in No 10?</p>
      <div className="flex items-start gap-3">
        <span className="text-4xl" aria-hidden>
          {party ? "🚪" : "🐈"}
        </span>
        <h3 className="font-display text-xl font-black leading-tight">{title}</h3>
      </div>
      <div className="text-[15px] leading-relaxed">{body}</div>
      <dl className="mt-auto grid grid-cols-2 gap-2 pt-3 text-center">
        <div className="rounded-2xl bg-paper p-2 ring-1 ring-ink/15">
          <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Votes counted</dt>
          <dd className="font-display text-xl font-black tabular-nums">{pct(keptShare)}</dd>
          <dd className="text-[11px] text-muted">of the real total</dd>
        </div>
        <div className="rounded-2xl bg-paper p-2 ring-1 ring-ink/15">
          <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Seats flipped</dt>
          <dd className="font-display text-xl font-black tabular-nums">{result.flipped.length}</dd>
          <dd className="text-[11px] text-muted">of {g.totalSeats}</dd>
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
}: {
  result: ScenarioResult;
  baseline: ScenarioResult;
  parties: Party[];
}) {
  const rows = [...parties]
    .filter((p) => result.seats[p.id] > 0 || baseline.seats[p.id] > 0 || result.voteShares[p.id] > 0.005)
    .sort(
      (a, b) =>
        result.seats[b.id] - result.seats[a.id] ||
        baseline.seats[b.id] - baseline.seats[a.id] ||
        result.voteShares[b.id] - result.voteShares[a.id],
    );
  return (
    <div className="card overflow-hidden p-0">
      <h3 className="px-4 pt-4 font-display text-lg font-extrabold sm:px-5">Scoreboard vs actual 2024</h3>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted">
            <th className="py-2 pl-4 font-extrabold sm:pl-5">Party</th>
            <th className="py-2 text-right font-extrabold">Seats</th>
            <th className="py-2 text-right font-extrabold">2024</th>
            <th className="py-2 text-center font-extrabold">±</th>
            <th className="py-2 pr-4 text-right font-extrabold sm:pr-5">Votes</th>
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
                <td className="py-2 text-right font-black tabular-nums">{result.seats[p.id]}</td>
                <td className="py-2 text-right tabular-nums text-muted">{baseline.seats[p.id]}</td>
                <td className="py-2 text-center tabular-nums">
                  <Delta d={d} />
                </td>
                <td className="py-2 pr-4 text-right tabular-nums sm:pr-5">
                  {pct(result.voteShares[p.id])}
                  <span className={`ml-1 text-xs ${dv >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {Math.abs(dv) >= 0.0005 ? `${dv > 0 ? "▲" : "▼"}${(Math.abs(dv) * 100).toFixed(1)}` : ""}
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

function Flips({ result, byId }: { result: ScenarioResult; byId: Map<PartyId, Party> }) {
  const top = result.flipped.slice(0, 8);
  return (
    <div className="card flex flex-col gap-3 p-4 sm:p-5">
      <h3 className="font-display text-lg font-extrabold">
        Jaw-droppers{" "}
        <span className="text-sm font-bold text-muted">
          ({result.flipped.length} seat{result.flipped.length === 1 ? "" : "s"} change hands)
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
              <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2 ring-1 ring-ink/15">
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
        <p className="text-xs text-muted">…plus {result.flipped.length - top.length} more.</p>
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
