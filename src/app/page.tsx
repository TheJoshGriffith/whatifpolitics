import { RecordsContent } from "@/components/RecordsContent";
import { WhatIfApp } from "@/components/WhatIfApp";
import { SiteLink as Link } from "@/components/SiteLink";
import { HashViews } from "@/components/HashViews";
import { HowItWorksContent } from "@/components/HowItWorksContent";
import { SourcesContent } from "@/components/SourcesContent";

function Play() {
  return (
    <div className="flex flex-col gap-8">
      <section className="relative pt-4 sm:pt-10">
        <p className="inline-block -rotate-2 rounded-full bg-mint px-3 py-1 text-xs font-extrabold uppercase tracking-wider ring-2 ring-ink">
          UK elections · the remix
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          What if only <span className="text-pink">some</span> of Britain had turned up?
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/80">
          Pick an election or referendum. Keep the over-65s at home, let only graduates vote, or
          let only women vote. Then watch every seat get re-counted. Silly? Absolutely.
          Interesting? Weirdly, yes.
        </p>
        <p className="mt-3 text-sm text-muted">
          It&apos;s a toy model, not a forecast —{" "}
          <Link href="/how-it-works/" className="font-bold text-ink underline underline-offset-2">
            here&apos;s how it works
          </Link>
          .
        </p>
        <span aria-hidden className="pointer-events-none absolute right-0 top-6 hidden rotate-6 text-8xl sm:block">
          🇬🇧
        </span>
      </section>
      <WhatIfApp />
    </div>
  );
}

export default function Home() {
  // The single-file preview can't open other pages, so it shows every page here and
  // switches between them on the URL hash (#how-it-works, #sources).
  if (process.env.NEXT_PUBLIC_ARTIFACT) {
    return (
      <HashViews
        views={{
          play: <Play />,
          "how-it-works": <HowItWorksContent />,
          sources: <SourcesContent />,
          records: <RecordsContent />,
        }}
      />
    );
  }
  return <Play />;
}
