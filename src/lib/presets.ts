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
  // Ipsos age bands (2010, 2015)
  { id: "only-under-35-ipsos", label: "Only under-35s", emoji: "🥑", blurb: "Just the 18–34s.", scenario: { dimension: "age", mode: "only", groups: ["18-24", "25-34"] } },
  { id: "only-over-55-ipsos", label: "Only over-55s", emoji: "🫖", blurb: "Polling stations, but make it a garden centre.", scenario: { dimension: "age", mode: "only", groups: ["55-64", "65+"] } },
  { id: "pensioners-home-ipsos", label: "Over-65s stay home", emoji: "🛋️", blurb: "Countdown is on.", scenario: { dimension: "age", mode: "exclude", groups: ["65+"] } },
  // YouGov 2017/2019 age bands
  { id: "only-under-30-yg", label: "Only under-30s", emoji: "🥑", blurb: "Avocado toast takes the wheel.", scenario: { dimension: "age", mode: "only", groups: ["18-19", "20-24", "25-29"] } },
  { id: "only-over-60-yg", label: "Only over-60s", emoji: "🫖", blurb: "Polling stations, but make it a garden centre.", scenario: { dimension: "age", mode: "only", groups: ["60-69", "70+"] } },
  // Referendums
  { id: "only-under-50-eu", label: "Only under-50s", emoji: "☕", blurb: "Just the 18–49s.", scenario: { dimension: "age", mode: "only", groups: ["18-24", "25-49"] } },
  { id: "only-over-65", label: "Only over-65s", emoji: "🫖", blurb: "Pensioners only. Werther's Originals all round.", scenario: { dimension: "age", mode: "only", groups: ["65+"] } },
  { id: "only-2015-nonvoters", label: "Only 2015 no-shows", emoji: "🛋️", blurb: "People who skipped the 2015 election but turned up for this one.", scenario: { dimension: "party2015", mode: "only", groups: ["dnv"] } },
  { id: "only-private-renters", label: "Only private renters", emoji: "🔑", blurb: "Generation Rent finally gets its way.", scenario: { dimension: "tenure", mode: "only", groups: ["private"] } },
  { id: "only-16-17", label: "Only 16–17s", emoji: "🎒", blurb: "First big UK vote open to 16- and 17-year-olds. Tiny poll sample (14 people!), so pinch of salt.", scenario: { dimension: "age", mode: "only", groups: ["16-17"] } },
  { id: "only-under-35-indy", label: "Only under-35s", emoji: "🥑", blurb: "Just the 16–34s.", scenario: { dimension: "age", mode: "only", groups: ["16-17", "18-24", "25-34"] } },
  { id: "only-labour-indy", label: "Only Labour voters", emoji: "🔴", blurb: "Westminster Labour voters only. Better Together's home turf?", scenario: { dimension: "party", mode: "only", groups: ["lab"] } },
  { id: "only-bme", label: "Only ethnic minorities", emoji: "🌍", blurb: "Ethnic-minority voters only.", scenario: { dimension: "ethnicity", mode: "only", groups: ["bme"] } },
  { id: "only-white-old", label: "Only White voters", emoji: "🔵", blurb: "White voters only.", scenario: { dimension: "ethnicity", mode: "only", groups: ["white"] } },
  // Grade × sex (2005, 2014)
  { id: "only-c2de-women", label: "Only working-class women", emoji: "🧺", blurb: "Only women in social grades C2 and DE vote.", scenario: { dimension: "classsex", mode: "only", groups: ["fC2", "fDE"] } },
  { id: "only-c2de-men", label: "Only working-class men", emoji: "🧤", blurb: "Only men in social grades C2 and DE vote.", scenario: { dimension: "classsex", mode: "only", groups: ["mC2", "mDE"] } },
  { id: "only-over-55-men", label: "Only men over 55", emoji: "👴", blurb: "Only men aged 55 and over vote.", scenario: { dimension: "agesex", mode: "only", groups: ["m55"] } },
  { id: "only-over-55-women", label: "Only women over 55", emoji: "👵", blurb: "Only women aged 55 and over vote.", scenario: { dimension: "agesex", mode: "only", groups: ["f55"] } },
  { id: "only-sun", label: "Only Sun readers", emoji: "☀️", blurb: "It's the Sun wot won it. Allegedly.", scenario: { dimension: "paper", mode: "only", groups: ["sun"] } },
  { id: "only-guardian", label: "Only Guardian readers", emoji: "🥗", blurb: "Quinoa at the ready.", scenario: { dimension: "paper", mode: "only", groups: ["guardian"] } },
  { id: "only-mail", label: "Only Daily Mail readers", emoji: "📰", blurb: "House prices and the weather.", scenario: { dimension: "paper", mode: "only", groups: ["mail"] } },
];

/** Presets whose slice and groups exist in this event's data. */
export function presetsFor(event: ElectionEvent): Preset[] {
  const seen = new Set<string>();
  return presets.filter((p) => {
    if (seen.has(p.label)) return false;
    const dim = event.dimensions.find((d) => d.id === p.scenario.dimension);
    const ok = !!dim && p.scenario.groups.every((g) => dim.groups.some((x) => x.id === g));
    if (ok) seen.add(p.label);
    return ok;
  });
}
