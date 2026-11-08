import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: { default: "What If Britain…?", template: "%s · What If Britain…?" },
  description:
    "Re-run UK general elections with a twist: what if only some of us had voted? A toy, not a prediction.",
};

export const viewport: Viewport = {
  themeColor: "#fff8ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
