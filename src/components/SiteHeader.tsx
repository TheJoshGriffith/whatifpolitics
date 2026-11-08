import Link from "next/link";

const nav = [
  { href: "/", label: "Play" },
  { href: "/how-it-works/", label: "How it works" },
  { href: "/sources/", label: "Sources" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href="/" className="group flex items-center gap-2" aria-label="What If Britain home">
        <span className="chip grid h-10 w-10 place-items-center bg-sun text-xl" aria-hidden>
          🤔
        </span>
        <span className="font-display text-lg font-extrabold leading-none tracking-tight sm:text-xl">
          What If Britain<span className="text-pink">…?</span>
        </span>
      </Link>
      <nav className="flex gap-1.5 text-sm font-bold">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-full px-3 py-1.5 hover:bg-ink hover:text-paper"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
