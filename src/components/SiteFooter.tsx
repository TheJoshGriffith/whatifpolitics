import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm sm:px-6">
        <p className="font-display text-base font-extrabold">
          ⚠️ This is a toy, not a prediction.
        </p>
        <p className="max-w-2xl opacity-80">
          It&apos;s a back-of-a-beer-mat model built from national polling averages and constituency
          results. Real people don&apos;t vote in neat demographic blocks, and nobody here is telling you
          how to vote. Have fun, don&apos;t quote it in Parliament.
        </p>
        <p className="opacity-80">
          <Link href="/how-it-works/" className="underline underline-offset-2">
            How it works
          </Link>{" "}
          ·{" "}
          <Link href="/sources/" className="underline underline-offset-2">
            Sources
          </Link>
        </p>
      </div>
    </footer>
  );
}
