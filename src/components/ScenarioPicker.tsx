import type { Dimension, DimensionId, GroupId, ScenarioMode } from "@/lib/types";
import { groupVoting, dimensions as allDimensions, sources } from "@/lib/data";

const dimEmoji: Record<DimensionId, string> = {
  age: "🎂",
  sex: "🚻",
  class: "🎩",
  education: "🎓",
};

export function ScenarioPicker({
  dimensions,
  dimension,
  mode,
  groups,
  onDimension,
  onMode,
  onToggleGroup,
  onReset,
}: {
  dimensions: Dimension[];
  dimension: DimensionId;
  mode: ScenarioMode;
  groups: GroupId[];
  onDimension: (d: DimensionId) => void;
  onMode: (m: ScenarioMode) => void;
  onToggleGroup: (g: GroupId) => void;
  onReset: () => void;
}) {
  const dim = dimensions.find((d) => d.id === dimension)!;
  const allChosen = mode === "exclude" && groups.length === dim.groups.length;

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
          className="grid grid-cols-1 gap-2 rounded-3xl border-2 border-ink bg-paper p-1.5 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Mode"
        >
          {(
            [
              ["exclude", "🙅 Nobody in these groups voted"],
              ["only", "☝️ ONLY these groups voted"],
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
        <TurnoutFacts dimensionId={dim.id} />
        {allChosen && (
          <p className="mt-2 text-sm font-bold text-pink">
            You&apos;ve stopped literally everyone voting. Bold. Democracy has left the building.
          </p>
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

function TurnoutFacts({ dimensionId }: { dimensionId: string }) {
  const dv = groupVoting[dimensionId as keyof typeof groupVoting];
  const dimension = allDimensions.find((d) => d.id === dimensionId);
  if (!dv || !dimension) return null;
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
