import type { Metadata } from "next";
import { PollingContent } from "@/components/PollingContent";

export const metadata: Metadata = { title: "How good are the polls?" };

export default function Polling() {
  return <PollingContent />;
}
