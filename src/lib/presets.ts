import type { ElectionEvent, Scenario } from "./types";

export interface Preset {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
  scenario: Scenario;
}

/** Group ids here must exist in src/data/dimensions.json. */
export const presets: Preset[] = [
  { id: "boomers-home", label: "Boomers stay home", emoji: "🛋️", blurb: "The 60+ crowd decide Countdown is more important.", scenario: { dimension: "age", mode: "exclude", groups: ["60-69", "70+"] } },
  { id: "only-genz", label: "Only Gen Z", emoji: "📱", blurb: "Just the 18–24s. No cap.", scenario: { dimension: "age", mode: "only", groups: ["18-24"] } },
  { id: "only-under-30", label: "Only under-30s", emoji: "🥑", blurb: "Avocado toast takes the wheel.", scenario: { dimension: "age", mode: "only", groups: ["18-24", "25-29"] } },
  { id: "only-over-60", label: "Only over-60s", emoji: "🫖", blurb: "Polling stations, but make it a garden centre.", scenario: { dimension: "age", mode: "only", groups: ["60-69", "70+"] } },
  { id: "only-women", label: "Only women", emoji: "👩", blurb: "The men are all down the pub.", scenario: { dimension: "sex", mode: "only", groups: ["female"] } },
  { id: "only-men", label: "Only men", emoji: "👨", blurb: "The women had better things to do.", scenario: { dimension: "sex", mode: "only", groups: ["male"] } },
  { id: "no-grads", label: "No graduates", emoji: "🚫🎓", blurb: "Anyone with a degree is stuck in a seminar.", scenario: { dimension: "education", mode: "exclude", groups: ["degree"] } },
  { id: "only-grads", label: "Only graduates", emoji: "🎓", blurb: "Mortarboards at the ready.", scenario: { dimension: "education", mode: "only", groups: ["degree"] } },
  { id: "only-c2de", label: "Only working class", emoji: "🔧", blurb: "Social grades C2 and DE only.", scenario: { dimension: "class", mode: "only", groups: ["C2", "DE"] } },
  { id: "only-ab", label: "Only the bosses", emoji: "💼", blurb: "Social grade AB only. Very senior. Many lanyards.", scenario: { dimension: "class", mode: "only", groups: ["AB"] } },
  { id: "only-renters", label: "Only renters", emoji: "🔑", blurb: "Generation Rent finally gets its way.", scenario: { dimension: "tenure", mode: "only", groups: ["private", "social"] } },
  { id: "only-owners", label: "Only homeowners", emoji: "🏡", blurb: "If you can't show a deed, you can't vote. Very 1820s.", scenario: { dimension: "tenure", mode: "only", groups: ["outright", "mortgage"] } },
  { id: "only-students", label: "Only students", emoji: "📖", blurb: "Polling day moved to the union bar.", scenario: { dimension: "work", mode: "only", groups: ["student"] } },
  { id: "retirees-home", label: "Retirees stay home", emoji: "🎣", blurb: "Gone fishing. Literally.", scenario: { dimension: "work", mode: "exclude", groups: ["retired"] } },
  { id: "only-white", label: "Only White voters", emoji: "🔵", blurb: "What the 85% of voters who are White picked on their own.", scenario: { dimension: "ethnicity", mode: "only", groups: ["white"] } },
  { id: "only-minorities", label: "Only ethnic minorities", emoji: "🌍", blurb: "Asian, Black, Mixed and other voters only.", scenario: { dimension: "ethnicity", mode: "only", groups: ["asian", "black", "mixed"] } },
  { id: "only-young-women", label: "Only young women", emoji: "🎧", blurb: "Women aged 18–24 only. Greens, brace yourselves.", scenario: { dimension: "agesex", mode: "only", groups: ["f18"] } },
  { id: "only-young-men", label: "Only young men", emoji: "🧢", blurb: "Men aged 18–24 only. Group chat goes to the polls.", scenario: { dimension: "agesex", mode: "only", groups: ["m18"] } },
  { id: "only-leave", label: "Only Leavers", emoji: "🇬🇧", blurb: "2016 Leave voters only. Take back control (of the ballot box).", scenario: { dimension: "brexit", mode: "only", groups: ["leave"] } },
  { id: "only-remain", label: "Only Remainers", emoji: "🇪🇺", blurb: "2016 Remain voters only. Still have the beret.", scenario: { dimension: "brexit", mode: "only", groups: ["remain"] } },
  { id: "only-70k", label: "Only £70k+ households", emoji: "🛥️", blurb: "Comfortably off and allowed to vote. Nobody else.", scenario: { dimension: "income", mode: "only", groups: ["70plus"] } },
];

/** Presets whose slice and groups exist in this event's data. */
export function presetsFor(event: ElectionEvent): Preset[] {
  return presets.filter((p) => {
    const dim = event.dimensions.find((d) => d.id === p.scenario.dimension);
    return !!dim && p.scenario.groups.every((g) => dim.groups.some((x) => x.id === g));
  });
}
