import type { ElectionEvent, GroupId, Scenario } from "./types";
import { MAX_TURNOUT_FACTOR } from "./engine";

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
  { id: "only-genz", label: "Only Gen Z", emoji: "📱", blurb: "Just the 18–24s.", scenario: { dimension: "age", mode: "only", groups: ["18-24"] } },
  { id: "only-under-30", label: "Only under-30s", emoji: "🥑", blurb: "Just the under-30s.", scenario: { dimension: "age", mode: "only", groups: ["18-24", "25-29"] } },
  { id: "only-over-60", label: "Only over-60s", emoji: "🫖", blurb: "Just the over-60s.", scenario: { dimension: "age", mode: "only", groups: ["60-69", "70+"] } },
  { id: "only-women", label: "Only women", emoji: "👩", blurb: "Only women vote.", scenario: { dimension: "sex", mode: "only", groups: ["female"] } },
  { id: "only-men", label: "Only men", emoji: "👨", blurb: "Only men vote.", scenario: { dimension: "sex", mode: "only", groups: ["male"] } },
  { id: "no-grads", label: "No graduates", emoji: "🚫🎓", blurb: "Everyone with a degree stays home.", scenario: { dimension: "education", mode: "exclude", groups: ["degree"] } },
  { id: "only-grads", label: "Only graduates", emoji: "🎓", blurb: "Only people with a degree vote.", scenario: { dimension: "education", mode: "only", groups: ["degree"] } },
  { id: "only-c2de", label: "Only social grades C2DE", emoji: "🔧", blurb: "Social grades C2 and DE only.", scenario: { dimension: "class", mode: "only", groups: ["C2", "DE"] } },
  { id: "only-ab", label: "Only social grade AB", emoji: "💼", blurb: "Social grade AB only: managerial and professional jobs.", scenario: { dimension: "class", mode: "only", groups: ["AB"] } },
  { id: "only-renters", label: "Only renters", emoji: "🔑", blurb: "Only people who rent their home vote.", scenario: { dimension: "tenure", mode: "only", groups: ["private", "social"] } },
  { id: "only-owners", label: "Only homeowners", emoji: "🏡", blurb: "Only people who own their home, outright or with a mortgage.", scenario: { dimension: "tenure", mode: "only", groups: ["outright", "mortgage"] } },
  { id: "only-students", label: "Only students", emoji: "📖", blurb: "Only full-time students vote.", scenario: { dimension: "work", mode: "only", groups: ["student"] } },
  { id: "retirees-home", label: "Retirees stay home", emoji: "🎣", blurb: "Everyone who's retired stays home.", scenario: { dimension: "work", mode: "exclude", groups: ["retired"] } },
  { id: "only-white", label: "Only White voters", emoji: "🔵", blurb: "What the 85% of voters who are White picked on their own.", scenario: { dimension: "ethnicity", mode: "only", groups: ["white"] } },
  { id: "only-minorities", label: "Only ethnic minorities", emoji: "🌍", blurb: "Asian, Black, Mixed and other voters only.", scenario: { dimension: "ethnicity", mode: "only", groups: ["asian", "black", "mixed"] } },
  { id: "only-young-women", label: "Only young women", emoji: "🎧", blurb: "Women aged 18–24 only.", scenario: { dimension: "agesex", mode: "only", groups: ["f18"] } },
  { id: "only-young-men", label: "Only young men", emoji: "🧢", blurb: "Men aged 18–24 only.", scenario: { dimension: "agesex", mode: "only", groups: ["m18"] } },
  { id: "only-leave", label: "Only Leavers", emoji: "🇬🇧", blurb: "Only people who voted Leave in 2016.", scenario: { dimension: "brexit", mode: "only", groups: ["leave"] } },
  { id: "only-remain", label: "Only Remainers", emoji: "🇪🇺", blurb: "Only people who voted Remain in 2016.", scenario: { dimension: "brexit", mode: "only", groups: ["remain"] } },
  { id: "only-70k", label: "Only £70k+ households", emoji: "🛥️", blurb: "Only households earning £70k or more.", scenario: { dimension: "income", mode: "only", groups: ["70plus"] } },
  // Ipsos age bands (2010, 2015)
  { id: "only-under-35-ipsos", label: "Only under-35s", emoji: "🥑", blurb: "Just the 18–34s.", scenario: { dimension: "age", mode: "only", groups: ["18-24", "25-34"] } },
  { id: "only-over-55-ipsos", label: "Only over-55s", emoji: "🫖", blurb: "Just the over-60s.", scenario: { dimension: "age", mode: "only", groups: ["55-64", "65+"] } },
  { id: "pensioners-home-ipsos", label: "Over-65s stay home", emoji: "🛋️", blurb: "Everyone 65 and over stays home.", scenario: { dimension: "age", mode: "exclude", groups: ["65+"] } },
  // YouGov 2017/2019 age bands
  { id: "only-under-30-yg", label: "Only under-30s", emoji: "🥑", blurb: "Just the under-30s.", scenario: { dimension: "age", mode: "only", groups: ["18-19", "20-24", "25-29"] } },
  { id: "only-over-60-yg", label: "Only over-60s", emoji: "🫖", blurb: "Just the over-60s.", scenario: { dimension: "age", mode: "only", groups: ["60-69", "70+"] } },
  // Referendums
  { id: "only-under-50-eu", label: "Only under-50s", emoji: "☕", blurb: "Just the 18–49s.", scenario: { dimension: "age", mode: "only", groups: ["18-24", "25-49"] } },
  { id: "only-over-65", label: "Only over-65s", emoji: "🫖", blurb: "Only people 65 and over vote.", scenario: { dimension: "age", mode: "only", groups: ["65+"] } },
  { id: "only-2015-nonvoters", label: "Only 2015 no-shows", emoji: "🛋️", blurb: "People who skipped the 2015 election but turned up for this one.", scenario: { dimension: "party2015", mode: "only", groups: ["dnv"] } },
  { id: "only-private-renters", label: "Only private renters", emoji: "🔑", blurb: "Only people who rent their home vote.", scenario: { dimension: "tenure", mode: "only", groups: ["private"] } },
  { id: "only-16-17", label: "Only 16–17s", emoji: "🎒", blurb: "First big UK vote open to 16- and 17-year-olds. Tiny poll sample (14 people!), so pinch of salt.", scenario: { dimension: "age", mode: "only", groups: ["16-17"] } },
  { id: "only-under-35-indy", label: "Only under-35s", emoji: "🥑", blurb: "Just the 16–34s.", scenario: { dimension: "age", mode: "only", groups: ["16-17", "18-24", "25-34"] } },
  { id: "only-labour-indy", label: "Only Labour voters", emoji: "🔴", blurb: "Only people who vote Labour at Westminster.", scenario: { dimension: "party", mode: "only", groups: ["lab"] } },
  { id: "only-bme", label: "Only ethnic minorities", emoji: "🌍", blurb: "Ethnic-minority voters only.", scenario: { dimension: "ethnicity", mode: "only", groups: ["bme"] } },
  { id: "only-white-old", label: "Only White voters", emoji: "🔵", blurb: "White voters only.", scenario: { dimension: "ethnicity", mode: "only", groups: ["white"] } },
  // Grade × sex (2005, 2014)
  { id: "only-c2de-women", label: "Only C2DE women", emoji: "🧺", blurb: "Only women in social grades C2 and DE vote.", scenario: { dimension: "classsex", mode: "only", groups: ["fC2", "fDE"] } },
  { id: "only-c2de-men", label: "Only C2DE men", emoji: "🧤", blurb: "Only men in social grades C2 and DE vote.", scenario: { dimension: "classsex", mode: "only", groups: ["mC2", "mDE"] } },
  { id: "only-over-55-men", label: "Only men over 55", emoji: "👴", blurb: "Only men aged 55 and over vote.", scenario: { dimension: "agesex", mode: "only", groups: ["m55"] } },
  { id: "only-over-55-women", label: "Only women over 55", emoji: "👵", blurb: "Only women aged 55 and over vote.", scenario: { dimension: "agesex", mode: "only", groups: ["f55"] } },
  { id: "only-sun", label: "Only Sun readers", emoji: "☀️", blurb: "Only Sun readers vote.", scenario: { dimension: "paper", mode: "only", groups: ["sun"] } },
  { id: "only-guardian", label: "Only Guardian readers", emoji: "📰", blurb: "Only Guardian readers vote.", scenario: { dimension: "paper", mode: "only", groups: ["guardian"] } },
  { id: "only-mail", label: "Only Daily Mail readers", emoji: "📰", blurb: "Only Daily Mail readers vote.", scenario: { dimension: "paper", mode: "only", groups: ["mail"] } },
];

/** Two slices at once (each line keeps both slices' group ids in one event's bands). */
export const comboPresets: Preset[] = [
  { id: "only-young-renters", label: "Only under-30s who rent", emoji: "🔑", blurb: "Only people aged under 30 who rent their home vote.", scenario: { dimension: "age", mode: "only", groups: ["18-19", "20-24", "25-29"], and: { dimension: "tenure", groups: ["private", "social"] } } },
  { id: "only-young-renters-24", label: "Only under-30s who rent", emoji: "🔑", blurb: "Only people aged under 30 who rent their home vote.", scenario: { dimension: "age", mode: "only", groups: ["18-24", "25-29"], and: { dimension: "tenure", groups: ["private", "social"] } } },
  { id: "only-young-renters-ipsos", label: "Only under-35s who rent", emoji: "🔑", blurb: "Only people aged under 35 who rent their home vote.", scenario: { dimension: "age", mode: "only", groups: ["18-24", "25-34"], and: { dimension: "tenure", groups: ["private", "social"] } } },
  { id: "no-old-owners", label: "No over-60 homeowners", emoji: "🏡", blurb: "People aged 60 and over who own their home stay at home.", scenario: { dimension: "age", mode: "exclude", groups: ["60-69", "70+"], and: { dimension: "tenure", groups: ["outright", "mortgage"] } } },
  { id: "no-old-owners-ipsos", label: "No over-55 homeowners", emoji: "🏡", blurb: "People aged 55 and over who own their home stay at home.", scenario: { dimension: "age", mode: "exclude", groups: ["55-64", "65+"], and: { dimension: "tenure", groups: ["outright", "mortgage"] } } },
  { id: "only-women-grads", label: "Only women graduates", emoji: "🎓", blurb: "Only women with a degree vote.", scenario: { dimension: "sex", mode: "only", groups: ["female"], and: { dimension: "education", groups: ["degree"] } } },
];

/**
 * Turnout presets: some groups turn out at the same rate as another group. Only offered
 * when the event's polling gives real turnout for every group involved.
 */
interface TurnoutPreset extends Omit<Preset, "scenario"> {
  dimension: string;
  /** Groups whose turnout changes ("all" = every group in the slice). */
  groups: GroupId[] | "all";
  /** The group whose real turnout they copy. */
  like: GroupId;
}

export const turnoutPresets: TurnoutPreset[] = [
  { id: "young-like-old-yg", label: "Young people vote like pensioners", emoji: "📈", blurb: "Under-30s turn out at the same rate as over-70s did.", dimension: "age", groups: ["18-19", "20-24", "25-29"], like: "70+" },
  { id: "young-like-old-ipsos", label: "Young people vote like pensioners", emoji: "📈", blurb: "Under-35s turn out at the same rate as over-65s did.", dimension: "age", groups: ["18-24", "25-34"], like: "65+" },
  { id: "old-like-young-yg", label: "Pensioners vote like young people", emoji: "📉", blurb: "Over-60s turn out at the same rate as 18–19s did.", dimension: "age", groups: ["60-69", "70+"], like: "18-19" },
  { id: "old-like-young-ipsos", label: "Pensioners vote like young people", emoji: "📉", blurb: "Over-55s turn out at the same rate as 18–24s did.", dimension: "age", groups: ["55-64", "65+"], like: "18-24" },
  { id: "renters-like-owners", label: "Renters vote like homeowners", emoji: "🗝️", blurb: "Private and social renters turn out at the same rate as outright owners did.", dimension: "tenure", groups: ["private", "social"], like: "outright" },
  { id: "c2de-like-ab", label: "Every grade votes like AB", emoji: "📊", blurb: "Social grades C1, C2 and DE turn out at the same rate as AB did.", dimension: "class", groups: ["C1", "C2", "DE"], like: "AB" },
  { id: "all-like-old-yg", label: "Every age votes like pensioners", emoji: "💯", blurb: "Every age group turns out at the same rate as over-70s did.", dimension: "age", groups: "all", like: "70+" },
  { id: "all-like-old-ipsos", label: "Every age votes like pensioners", emoji: "💯", blurb: "Every age group turns out at the same rate as over-65s did.", dimension: "age", groups: "all", like: "65+" },
];

/** Resolve a turnout preset for one event, or null if its turnout figures are missing. */
export function turnoutPresetScenario(t: TurnoutPreset, event: ElectionEvent): Scenario | null {
  const dim = event.dimensions.find((d) => d.id === t.dimension);
  const gv = event.groupVoting[t.dimension];
  if (!dim || !gv) return null;
  const groups = t.groups === "all" ? dim.groups.map((g) => g.id) : t.groups;
  const real = (g: GroupId) => {
    const x = gv.groups[g]?.turnout;
    return dim.groups.some((d) => d.id === g) && typeof x === "number" && x > 0 ? x : null;
  };
  const target = real(t.like);
  if (target === null) return null;
  const turnout: Record<GroupId, number> = {};
  for (const g of groups) {
    const r = real(g);
    if (r === null) return null;
    if (g === t.like) continue;
    turnout[g] = Math.min(Math.round((target / r) * 100) / 100, MAX_TURNOUT_FACTOR);
  }
  return { dimension: t.dimension, mode: "turnout", groups: [], turnout };
}

/** Presets whose slice and groups exist in this event's data. */
export function presetsFor(event: ElectionEvent): Preset[] {
  const seen = new Set<string>();
  const fits = (dimension: string, groups: GroupId[]) => {
    const dim = event.dimensions.find((d) => d.id === dimension);
    return !!dim && groups.every((g) => dim.groups.some((x) => x.id === g));
  };
  const out: Preset[] = [];
  for (const p of [...presets, ...comboPresets]) {
    if (seen.has(p.label)) continue;
    const { dimension, groups, and } = p.scenario;
    if (!fits(dimension, groups) || (and && (and.dimension === dimension || !fits(and.dimension, and.groups)))) continue;
    seen.add(p.label);
    out.push(p);
  }
  for (const t of turnoutPresets) {
    if (seen.has(t.label)) continue;
    const scenario = turnoutPresetScenario(t, event);
    if (!scenario) continue;
    seen.add(t.label);
    const { id, label, emoji, blurb } = t;
    out.push({ id, label, emoji, blurb, scenario });
  }
  return out;
}
