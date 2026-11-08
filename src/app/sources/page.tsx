import type { Metadata } from "next";
import { sources, groupVoting, dimensions, isPlaceholder } from "@/lib/data";

export const metadata: Metadata = { title: "Sources" };

export default function Sources() {
  const usedFor = (id: string) =>
    dimensions.filter((d) => groupVoting[d.id]?.source === id).map((d) => d.label);
  return (
    <article className="flex flex-col gap-6 pt-4 sm:pt-10">
      <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
        Sources <span aria-hidden>📚</span>
      </h1>
      <p className="max-w-2xl text-lg text-ink/80">
        Where the numbers come from. If you spot something wrong, it&apos;s almost certainly our
        fault, not theirs.
      </p>
      {isPlaceholder && (
        <p className="rounded-2xl border-2 border-dashed border-ink bg-white/70 px-4 py-2.5 text-sm font-bold">
          🚧 Some data is still placeholder. These entries will be checked and finalised.
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {sources.map((s) => {
          const dims = usedFor(s.id);
          return (
            <li key={s.id} className="card flex flex-col gap-2 p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted">
                {s.publisher} · {s.year}
              </p>
              <h2 className="font-display text-lg font-extrabold leading-snug">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-pink decoration-2 underline-offset-4 hover:decoration-ink">
                  {s.name} ↗
                </a>
              </h2>
              <p className="text-sm leading-relaxed">{s.note}</p>
              {dims.length > 0 && (
                <p className="text-xs font-bold text-muted">Used for: {dims.join(", ")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
