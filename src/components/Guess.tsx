"use client";

import { useState } from "react";
import type { ElectionEvent, PartyId, ScenarioResult } from "@/lib/types";

/** What the reader guessed before peeking. */
export type GuessValue =
  | { kind: "general"; party: PartyId; seats: number }
  | { kind: "referendum"; side: PartyId; share: number };

/** The parties worth offering as "largest party": anyone with a real seat, biggest first. */
function contenders(event: ElectionEvent, baseline: ScenarioResult) {
  return [...event.parties]
    .filter((p) => (baseline.seats[p.id] ?? 0) >= 1 && p.id !== "spk")
    .sort((a, b) => (baseline.seats[b.id] ?? 0) - (baseline.seats[a.id] ?? 0))
    .slice(0, 6);
}

/** Hides the answer and asks for a guess first. */
export function GuessCard({
  event,
  baseline,
  description,
  onReveal,
  onSkip,
}: {
  event: ElectionEvent;
  baseline: ScenarioResult;
  description: string;
  onReveal: (g: GuessValue) => void;
  onSkip: () => void;
}) {
  const general = event.kind === "general";
  const options = general ? contenders(event, baseline) : event.parties;
  const [party, setParty] = useState<PartyId | null>(null);
  const total = baseline.seatResults.length;
  const [seats, setSeats] = useState<number | null>(null);
  const first = event.parties[0];
  const [share, setShare] = useState(Math.round((baseline.voteShares[first.id] ?? 0.5) * 100));
  const seatValue = seats ?? (party ? (baseline.seats[party] ?? 0) : Math.round(total / 2));
  const ready = general ? party !== null : true;

  return (
    <div className="card flex flex-col gap-4 bg-sky/20 p-5 sm:p-7">
      <p className="font-display text-sm font-extrabold uppercase tracking-wider text-muted">Have a guess first</p>
      <p className="font-display text-xl font-extrabold leading-snug">{description}</p>
      {general ? (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-extrabold">Who wins the most seats?</legend>
            <div className="flex flex-wrap gap-2">
              {options.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={party === p.id}
                  onClick={() => setParty(p.id)}
                  className={`chip px-3 py-1.5 text-sm font-extrabold ${party === p.id ? "bg-ink text-paper" : "bg-card hover:bg-sun"}`}
                >
                  <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.colour }} />
                  {p.name}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 text-sm font-extrabold">
            <span>
              How many seats do they get?{" "}
              <span className="tabular-nums">{party ? seatValue : "pick a party first"}</span>
              {party && <span className="font-bold text-muted"> (really: {baseline.seats[party] ?? 0})</span>}
            </span>
            <input
              type="range"
              min={0}
              max={total}
              value={seatValue}
              disabled={!party}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="accent-grape"
              aria-label="Seats for your pick"
            />
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-1 text-sm font-extrabold">
          <span>
            What share of the vote does {first.name} get?{" "}
            <span className="tabular-nums">{share}%</span>
            <span className="font-bold text-muted">
              {" "}
              (really: {((baseline.voteShares[first.id] ?? 0) * 100).toFixed(1)}%)
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={share}
            onChange={(e) => setShare(Number(e.target.value))}
            className="accent-grape"
            aria-label={`${first.name} share of the vote`}
          />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() =>
            onReveal(
              general
                ? { kind: "general", party: party!, seats: seatValue }
                : { kind: "referendum", side: first.id, share: share / 100 },
            )
          }
          className="chip bg-sun px-4 py-2 font-extrabold hover:bg-mint disabled:opacity-50"
        >
          Show me
        </button>
        <button type="button" onClick={onSkip} className="chip bg-card px-4 py-2 text-sm font-bold hover:bg-sun">
          Just tell me
        </button>
      </div>
    </div>
  );
}

/** How close the guess was, shown above the real answer. */
export function GuessVerdict({
  guess,
  event,
  seats,
  result,
}: {
  guess: GuessValue;
  event: ElectionEvent;
  seats: Record<PartyId, number>;
  result: ScenarioResult;
}) {
  const name = (id: PartyId) => event.parties.find((p) => p.id === id)?.name ?? id;
  let text: string;
  let right: boolean;
  if (guess.kind === "general") {
    const [top] = Object.entries(seats)
      .filter(([p]) => p !== "spk")
      .sort((a, b) => b[1] - a[1]);
    const got = seats[guess.party] ?? 0;
    const off = Math.abs(got - guess.seats);
    right = top?.[0] === guess.party;
    text = right
      ? `You had ${name(guess.party)} on top, and they are, with ${got} seats. You said ${guess.seats}, so you were ${off === 0 ? "spot on" : `${off} seat${off === 1 ? "" : "s"} out`}.`
      : `You had ${name(guess.party)} on top, but ${name(top[0])} win the most seats (${top[1]}). ${name(guess.party)} get ${got}, against your ${guess.seats}.`;
  } else {
    const real = result.voteShares[guess.side] ?? 0;
    const off = Math.abs(real - guess.share) * 100;
    const [win] = Object.entries(result.voteShares).sort((a, b) => b[1] - a[1]);
    right = guess.share > 0.5 === (win[0] === guess.side);
    text = `You said ${Math.round(guess.share * 100)}% for ${name(guess.side)}. It's ${(real * 100).toFixed(1)}%, so you were ${off < 0.5 ? "spot on" : `${off.toFixed(1)} points out`}${right ? ", and you called the winner." : `, and ${name(win[0])} wins.`}`;
  }
  return (
    <p className={`rounded-2xl border-2 border-ink px-4 py-3 text-sm font-bold ${right ? "bg-mint/40" : "bg-pink/20"}`}>
      <span aria-hidden>{right ? "🎯 " : "🙃 "}</span>
      {text}
    </p>
  );
}
