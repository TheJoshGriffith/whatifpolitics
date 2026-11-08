import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Internal link. Normally a Next <Link>. In the ARTIFACT preview build
 * (NEXT_PUBLIC_ARTIFACT=1) it's a plain <a>, and scripts/artifact-postprocess.mjs
 * rewrites the hrefs to relative paths so the site works from any sub-folder.
 */
export function SiteLink({ href, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  if (process.env.NEXT_PUBLIC_ARTIFACT) return <a href={href} {...(rest as ComponentProps<"a">)} />;
  return <Link href={href} {...rest} />;
}
