import type { Metadata } from "next";
import { SourcesContent } from "@/components/SourcesContent";

export const metadata: Metadata = { title: "Sources" };

export default function Sources() {
  return <SourcesContent />;
}
