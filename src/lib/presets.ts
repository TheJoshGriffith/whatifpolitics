import type { Scenario } from "./types";

export interface Preset {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
  scenario: Scenario;
}

/** Group ids here must exist in src/data/dimensions.json. */
export const presets: Preset[] = [
  { id: "boomers-home", label: "Boomers stay home", emoji: "🛋️", blurb: "The 65+ crowd decide Countdown is more important.", scenario: { dimension: "age", mode: "exclude", groups: ["65+"] } },
  { id: "only-genz", label: "Only Gen Z", emoji: "📱", blurb: "Just the 18–24s. No cap.", scenario: { dimension: "age", mode: "only", groups: ["18-24"] } },
  { id: "only-under-35", label: "Only under-35s", emoji: "🥑", blurb: "Avocado toast takes the wheel.", scenario: { dimension: "age", mode: "only", groups: ["18-24", "25-34"] } },
  { id: "only-over-55", label: "Only over-55s", emoji: "🫖", blurb: "Polling stations, but make it a garden centre.", scenario: { dimension: "age", mode: "only", groups: ["55-64", "65+"] } },
  { id: "only-women", label: "Only women", emoji: "👩", blurb: "The men are all down the pub.", scenario: { dimension: "sex", mode: "only", groups: ["female"] } },
  { id: "only-men", label: "Only men", emoji: "👨", blurb: "The women had better things to do.", scenario: { dimension: "sex", mode: "only", groups: ["male"] } },
  { id: "no-grads", label: "No graduates", emoji: "🚫🎓", blurb: "Anyone with a degree is stuck in a seminar.", scenario: { dimension: "education", mode: "exclude", groups: ["degree"] } },
  { id: "only-grads", label: "Only graduates", emoji: "🎓", blurb: "Mortarboards at the ready.", scenario: { dimension: "education", mode: "only", groups: ["degree"] } },
  { id: "only-c2de", label: "Only working class", emoji: "🔧", blurb: "Social grades C2 and DE only.", scenario: { dimension: "class", mode: "only", groups: ["C2", "DE"] } },
  { id: "only-ab", label: "Only the bosses", emoji: "💼", blurb: "Social grade AB only. Very senior. Many lanyards.", scenario: { dimension: "class", mode: "only", groups: ["AB"] } },
];
