import { isPlaceholder } from "@/lib/data";

export function PlaceholderBanner() {
  if (!isPlaceholder) return null;
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink bg-white/70 px-4 py-2.5 text-sm font-bold">
      🚧 Heads up: this build is running on <u>made-up placeholder data</u> (fictional seats, rough
      numbers). Real 2024 results are on their way.
    </div>
  );
}
