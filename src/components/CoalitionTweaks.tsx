"use client";

import { useId, useState } from "react";
import { coalitionPairs, type WillingnessOverrides } from "@/lib/systems";
import type { Party, PartyId } from "@/lib/types";

/** Collapsible sliders for how willing each pair of parties is to do a deal. */
export function CoalitionTweaks({
  eventId,
  seats,
  parties,
  overrides,
  onChange,
}: {
  eventId: string;
  seats: Record<PartyId, number>;
  parties: Party[];
  overrides: WillingnessOverrides;
  onChange: (o: WillingnessOverrides) => void;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const byId = new Map(parties.map((p) => [p.id, p]));
  const pairs = coalitionPairs(eventId, seats);
  const changed = pairs.filter((p) => overrides[p.key] !== undefined).length;
  const short = (id: PartyId) => byId.get(id)?.short ?? id;

  return (
    <div className="card flex flex-col gap-3 p-4 sm:p-5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${uid}-panel`}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 text-left"
      >
        <span className="font-display text-lg font-extrabold leading-tight">
          Tweak who&apos;ll work with whom
          {changed > 0 && (
            <span className="ml-2 rounded-full bg-pink px-2 py-0.5 align-middle text-xs font-extrabold text-white">
              {changed} changed
            </span>
          )}
        </span>
        <span aria-hidden className="text-xl font-black">
          {open ? "−" : "+"}
        </span>
      </button>
      {!open && (
        <p className="text-sm text-muted">
          The No 10 odds depend on how willing each pair of parties is to do a deal. Open this to set your own numbers.
        </p>
      )}
      {open && (
        <div id={`${uid}-panel`} className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            0 means they&apos;d never put each other in government, 1 means they&apos;d sign tomorrow. The starting values
            are our own reading of what parties said at the time. The odds above update as you drag.
          </p>
          {pairs.length === 0 ? (
            <p className="text-sm">There aren&apos;t enough parties with seats to make a deal.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {pairs.map((p) => {
                const v = overrides[p.key] ?? p.base;
                const id = `${uid}-${p.key}`;
                const isChanged = overrides[p.key] !== undefined;
                return (
                  <li key={p.key} className="flex flex-col gap-0.5">
                    <label htmlFor={id} className="flex items-center justify-between gap-2 text-sm font-bold">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Dot colour={byId.get(p.a)?.colour} />
                        {short(p.a)}
                        <span className="text-muted">and</span>
                        <Dot colour={byId.get(p.b)?.colour} />
                        {short(p.b)}
                      </span>
                      <span className={`shrink-0 tabular-nums ${isChanged ? "text-pink" : "text-muted"}`}>
                        {v.toFixed(2)}
                        {isChanged && <span className="sr-only"> (default {p.base.toFixed(2)})</span>}
                      </span>
                    </label>
                    <input
                      id={id}
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={v}
                      onChange={(e) => onChange({ ...overrides, [p.key]: Number(e.target.value) })}
                      className="w-full accent-grape"
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={() => onChange({})}
            disabled={changed === 0}
            className="chip self-start bg-card px-3 py-1 text-sm font-extrabold hover:bg-sun disabled:opacity-40"
          >
            Reset to our numbers
          </button>
        </div>
      )}
    </div>
  );
}

function Dot({ colour }: { colour?: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-ink/40"
      style={{ background: colour ?? "#ccc" }}
    />
  );
}
