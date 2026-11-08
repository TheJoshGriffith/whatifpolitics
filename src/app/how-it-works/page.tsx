import type { Metadata } from "next";
import { HowItWorksContent } from "@/components/HowItWorksContent";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorks() {
  return <HowItWorksContent />;
}
