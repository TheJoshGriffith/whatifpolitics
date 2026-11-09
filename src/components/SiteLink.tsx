import Link from "next/link";
import type { ComponentProps } from "react";

const HASHES: Record<string, string> = { "/": "#play", "/how-it-works/": "#how-it-works", "/sources/": "#sources", "/records/": "#records", "/polling/": "#polling" };

/**
 * Internal link. Normally a Next <Link>. In the single-page preview build
 * (NEXT_PUBLIC_ARTIFACT=1) every page lives on the home page, so links become #hashes.
 */
export function SiteLink({ href, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  if (process.env.NEXT_PUBLIC_ARTIFACT)
    return <a href={HASHES[href] ?? href} {...(rest as ComponentProps<"a">)} />;
  return <Link href={href} {...rest} />;
}
