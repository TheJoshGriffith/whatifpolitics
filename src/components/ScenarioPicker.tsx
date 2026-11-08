import type { Dimension, DimensionId, GroupId, GroupVoting, ScenarioMode } from "@/lib/types";
import { sources } from "@/lib/data";
import { maxTurnoutFactor } from "@/lib/engine";

const dimEmoji: Record<string, string> = {
  age: "🎂",
  sex: "🚻",
  class: "🎩",
  education: "🎓",
  tenure: "🏠",
  work: "💼",
  ethnicity: "🌍",
  agesex: "👫",
  brexit: "🇪🇺",
  income: "💷",
  paper: "📰",
  party2015: "🗳️",
  party: "🗳️",
  classsex: "🎩",
};

export function ScenarioPicker({
  dimensions,
  groupVoting,
  dimension,
  mode,
  groups,
  onDimension,
  onMode,
  onToggleGroup,
  onReset,
  turnout,
  onDial,
  onResetDials,
  andDimension,
  andGroups,
  onAndDimension,
  onToggleAndGroup,
}: {
  dimensions: Dimension[];
  groupVoting: GroupVoting;
  dimension: DimensionId;
  mode: ScenarioMode;
  groups: GroupId[];
  onDimension: (d: DimensionId) => void;
  onMode: (m: ScenarioMode) => void;
  onToggleGroup: (g: GroupId) => void;
  onReset: () => void;
  /** Turnout dials (multipliers, 1 = as real) for "turnout" mode. */
  turnout: Record<GroupId, number>;
  onDial: (g: GroupId, factor: number) => void;
  onResetDials: () => void;
  /** Optional second slice. */
  andDimension: DimensionId | null;
  andGroups: GroupId[];
  onAndDimension: (d: DimensionId | null) => void;
  onToggleAndGroup: (g: GroupId) => void;
}) {
  const dim = dimensions.find((d) => d.id === dimension)!;
  const allChosen = mode === "exclude" && groups.length === dim.groups.length;
  const andDim = dimensions.find((d) => d.id === andDimension && d.id !== dimension) ?? null;

  return (
    <section className="card flex flex-col gap-5 p-4 sm:p-6" aria-labelledby="picker-h">
      <h2 id="picker-h" className="font-display text-xl font-extrabold sm:text-2xl">
        Build your own what-if 🛠️
      </h2>

      <Step n={1} title="Pick a way to slice the country">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Dimension">
          {dimensions.map((d) => {
            const on = d.id === dimension;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onDimension(d.id)}
                className={`chip px-3 py-2 text-sm font-extrabold ${on ? "bg-grape text-white" : "bg-card hover:bg-sky/30"}`}
              >
                <span aria-hidden>{dimEmoji[d.id] ?? "🔹"}</span> {d.label}
              </button>
            );
          })}
        </div>
      </Step>

      <Step n={2} title="Choose your plot twist">
        <div
          className="grid grid-cols-1 gap-2 rounded-3xl border-2 border-ink bg-paper p-1.5 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Mode"
        >
          {(
            [
              ["exclude", "🙅 Nobody in these groups voted"],
              ["only", "☝️ ONLY these groups voted"],
              ["turnout", "🎚️ Turnout dials"],
            ] as const
          ).map(([m, label]) => {
            const on = m === mode;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onMode(m)}
                className={`rounded-2xl px-3 py-2.5 text-sm font-extrabold transition-colors ${
                  on ? "bg-ink text-paper" : "text-ink hover:bg-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Step>

      {mode === "turnout" ? (
        <Step n={3} title="Turn each group's turnout up or down">
          <TurnoutDials
            dimension={dim}
            groupVoting={groupVoting}
            turnout={turnout}
            onDial={onDial}
            onReset={onResetDials}
          />
        </Step>
      ) : (
        <Step n={3} title="Tick the groups">
          <div className="flex flex-wrap gap-2">
            {dim.groups.map((g) => {
              const on = groups.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggleGroup(g.id)}
                  className={`chip flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold ${
                    on ? (mode === "exclude" ? "bg-pink text-white line-through decoration-2" : "bg-mint") : "bg-card hover:bg-sun/60"
                  }`}
                >
                  <span aria-hidden className="no-underline">{g.emoji}</span>
                  {g.label}
                </button>
              );
            })}
            {groups.length > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="rounded-full px-3 py-1.5 text-sm font-bold text-muted underline underline-offset-2 hover:text-ink"
              >
                clear
              </button>
            )}
          </div>
          <TurnoutFacts dimension={dim} groupVoting={groupVoting} />
          {allChosen && !andDim && (
            <p className="mt-2 text-sm font-bold text-pink">
              You&apos;ve stopped literally everyone voting. Bold. Democracy has left the building.
            </p>
          )}
        </Step>
      )}

      <Step n={4} title="Combine with a second slice (optional)">
        <p className="text-sm text-ink/80">
          {mode === "only"
            ? "Only people in your groups above who are also in the groups you tick here get to vote."
            : mode === "exclude"
              ? "Only people in your groups above who are also in the groups you tick here stay at home."
              : "The dials only apply to people in the groups you tick here. Everyone else votes as they really did. The turnout figures on the dials are for the whole group."}
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Second slice">
          {[null, ...dimensions.filter((d) => d.id !== dimension)].map((d) => {
            const on = (d?.id ?? null) === (andDim?.id ?? null);
            return (
              <button
                key={d?.id ?? "none"}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onAndDimension(d?.id ?? null)}
                className={`chip px-3 py-1.5 text-sm font-bold ${on ? "bg-grape text-white" : "bg-card hover:bg-sky/30"}`}
              >
                {d ? (
                  <>
                    <span aria-hidden>{dimEmoji[d.id] ?? "🔹"}</span> {d.label}
                  </>
                ) : (
                  "No second slice"
                )}
              </button>
            );
          })}
        </div>
        {andDim && (
          <div className="flex flex-wrap gap-2" aria-label={`${andDim.label} groups`}>
            {andDim.groups.map((g) => {
              const on = andGroups.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggleAndGroup(g.id)}
                  className={`chip flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold ${on ? "bg-sky" : "bg-card hover:bg-sun/60"}`}
                >
                  <span aria-hidden>{g.emoji}</span>
                  {g.label}
                </button>
              );
            })}
          </div>
        )}
        {andDim && andGroups.length === 0 && (
          <p className="text-sm font-bold text-muted">Tick at least one {andDim.label.toLowerCase()} group to combine the two slices.</p>
        )}
      </Step>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="flex items-center gap-2 text-sm font-extrabold">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sun text-xs ring-2 ring-ink">
          {n}
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function TurnoutFacts({ dimension, groupVoting }: { dimension: Dimension; groupVoting: GroupVoting }) {
  const dv = groupVoting[dimension.id];
  if (!dv) return null;
  const facts = dimension.groups
    .map((g) => ({ g, t: dv.groups[g.id]?.turnout }))
    .filter((x): x is { g: (typeof x)["g"]; t: number } => typeof x.t === "number");
  const voterBits = dimension.groups.map(
    (g) => `${g.label} ${Math.round((dv.groups[g.id]?.voterShare ?? 0) * 100)}%`,
  );
  const src = sources.find((s) => s.id === dv.source);
  const tsrc = sources.find((s) => s.id === dv.turnoutSource);
  return (
    <div className="mt-3 rounded-2xl bg-sun/30 px-3 py-2 text-sm text-ink/80">
      <p>
        <b>Who actually voted:</b> {voterBits.join(" · ")}{" "}
        <span className="text-muted">({src?.publisher ?? "poll"})</span>
      </p>
      {facts.length > 0 && (
        <p className="mt-1">
          <b>Turnout gossip:</b>{" "}
          {facts.map(({ g, t }) => `only ${Math.round(t * 100)}% of ${g.label.split(" (")[0]}`).join(", ")}{" "}
          bothered to vote. <span className="text-muted">({tsrc?.publisher ?? "poll"})</span>
        </p>
      )}
    </div>
  );
}

/** Slider value labels. `pct` is the dial in % of real turnout. */
export function dialLabel(pct: number, realTurnout: number | null | undefined): string {
  if (pct <= 0) return "Stayed home";
  if (pct === 100) return "As real";
  if (typeof realTurnout === "number" && pct * realTurnout >= 99.5) return "Everyone shows up";
  return `${pct}% of real`;
}

function TurnoutDials({
  dimension,
  groupVoting,
  turnout,
  onDial,
  onReset,
}: {
  dimension: Dimension;
  groupVoting: GroupVoting;
  turnout: Record<GroupId, number>;
  onDial: (g: GroupId, factor: number) => void;
  onReset: () => void;
}) {
  const dv = groupVoting[dimension.id];
  const anyMoved = Object.values(turnout).some((f) => f !== 1);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink/80">
        100% means a group turns out just like it really did. 0% means it stays at home, and 200% means twice as many of them vote.
        Where a poll gives a group&apos;s real turnout, we show what the dial means in turnout terms and stop at 100% turnout.
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {dimension.groups.map((g) => {
          const real = dv?.groups[g.id]?.turnout;
          const max = Math.floor(maxTurnoutFactor(real) * 100);
          const pct = Math.min(Math.round((turnout[g.id] ?? 1) * 100), max);
          const id = `dial-${dimension.id}-${g.id}`;
          return (
            <div key={g.id} className="flex min-w-0 flex-col gap-1 rounded-2xl bg-paper px-3 py-2 ring-2 ring-ink/10">
              <label htmlFor={id} className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm font-bold">
                <span>
                  <span aria-hidden>{g.emoji}</span> {g.label}
                </span>
                <span className={`tabular-nums ${pct === 100 ? "text-muted" : pct < 100 ? "text-pink" : "text-grape"}`}>
                  {dialLabel(pct, real)}
                </span>
              </label>
              <input
                id={id}
                type="range"
                min={0}
                max={max}
                step={1}
                value={pct}
                onChange={(e) => onDial(g.id, Number(e.target.value) / 100)}
                aria-valuetext={`${pct}% of real turnout${typeof real === "number" ? `, about ${Math.round(pct * real)}% turnout` : ""}`}
                className="w-full accent-grape"
              />
              <span className="flex justify-between text-xs text-muted">
                <span>Stayed home</span>
                <span className="tabular-nums">
                  {typeof real === "number"
                    ? `${Math.round(pct * real)}% turnout (really ${Math.round(real * 100)}%)`
                    : `${pct}% of the real votes`}
                </span>
                <span>{typeof real === "number" && max < 200 ? "Everyone" : "200%"}</span>
              </span>
            </div>
          );
        })}
      </div>
      {anyMoved && (
        <button
          type="button"
          onClick={onReset}
          className="self-start rounded-full px-1 text-sm font-bold text-muted underline underline-offset-2 hover:text-ink"
        >
          put every dial back to 100%
        </button>
      )}
    </div>
  );
}
