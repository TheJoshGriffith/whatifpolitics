import type { Metadata } from "next";
import { RecordsContent } from "@/components/RecordsContent";

export const metadata: Metadata = { title: "Record book" };

export default function Records() {
  return <RecordsContent />;
}
