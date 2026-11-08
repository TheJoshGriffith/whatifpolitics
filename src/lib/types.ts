/**
 * Data contract for "What If Britain…?".
 *
 * Every JSON file in src/data/ conforms to one of the `*File` shapes below.
 * Swap the placeholder JSON for real data and the whole site follows along.
 */

export type PartyId = string;
export type DimensionId = "age" | "sex" | "class" | "education" | "tenure" | "work" | "ethnicity";
export type GroupId = string;

export interface Party {
  id: PartyId;
  name: string;
  short: string;
  /** CSS colour, e.g. "#E4003B" */
  colour: string;
}

export interface Constituency {
  /** ONS code, e.g. "E14001234" */
  id: string;
  name: string;
  region: string;
  electorate: number;
  /** Actual 2024 votes per party id. Parties missing here got zero. */
  votes: Record<PartyId, number>;
  /**
   * Optional seat-specific share of the adult population in each group
   * (e.g. from the Census). When present, the seat's voter mix is
   * share × group turnout; when absent, the national voter mix is used.
   */
  groupShares?: Partial<Record<DimensionId, Record<GroupId, number>>>;
}

export interface DimensionGroup {
  id: GroupId;
  label: string;
  emoji: string;
}

export interface Dimension {
  id: DimensionId;
  label: string;
  groups: DimensionGroup[];
}

/** National (poll-derived) behaviour of one group. */
export interface GroupVote {
  /** This group's share of everyone who voted, nationally (0..1). */
  voterShare: number;
  /** Reported turnout (fraction of the group's adults who voted), if a source gives it. */
  turnout: number | null;
  /** Vote share per party among those who voted. Should sum to ~1. */
  shares: Record<PartyId, number>;
}

export interface DimensionVoting {
  /** Id of a Source in sources.json */
  source: string;
  /** Source id for the turnout figures, if different. */
  turnoutSource?: string;
  groups: Record<GroupId, GroupVote>;
}

/** Per dimension, per group voting behaviour. */
export type GroupVoting = Record<DimensionId, DimensionVoting>;

export interface Source {
  id: string;
  name: string;
  publisher: string;
  url: string;
  year: number;
  note: string;
  /** Optional link straight to the raw tables. */
  tablesUrl?: string;
}

// ---------- JSON file wrappers (src/data/*.json) ----------

interface DataFile {
  /** true while the file holds made-up numbers */
  placeholder: boolean;
}

export interface PartiesFile extends DataFile {
  /** Order here is the left-to-right order used in the parliament chart. */
  parties: Party[];
}

export interface DimensionsFile extends DataFile {
  dimensions: Dimension[];
}

export interface ConstituenciesFile extends DataFile {
  constituencies: Constituency[];
}

export interface GroupVotingFile extends DataFile {
  groupVoting: GroupVoting;
}

export interface SourcesFile extends DataFile {
  sources: Source[];
}

// ---------- Engine types ----------

export type ScenarioMode = "exclude" | "only";

export interface Scenario {
  dimension: DimensionId;
  mode: ScenarioMode;
  groups: GroupId[];
}

/** Raked votes for one seat & dimension: group -> party -> votes */
export type GroupPartyVotes = Record<GroupId, Record<PartyId, number>>;

export interface SeatResult {
  id: string;
  name: string;
  region: string;
  votes: Record<PartyId, number>;
  totalVotes: number;
  winner: PartyId | null;
  /** winner's lead over runner-up as a share of votes cast (0..1) */
  margin: number;
}

export interface FlippedSeat {
  id: string;
  name: string;
  region: string;
  from: PartyId;
  to: PartyId;
  /** Original 2024 majority as a share of votes, bigger = more surprising */
  originalMargin: number;
  newMargin: number;
}

export interface GovernmentOutcome {
  totalSeats: number;
  majorityNeeded: number;
  largestParty: PartyId | null;
  largestPartySeats: number;
  hasMajority: boolean;
  /** seats above (positive) or below (negative) the majority line */
  majority: number;
  /** smallest greedy combo of parties that clears the line (if hung) */
  possibleDeal: PartyId[] | null;
}

export interface ScenarioResult {
  scenario: Scenario | null;
  seats: Record<PartyId, number>;
  votes: Record<PartyId, number>;
  voteShares: Record<PartyId, number>;
  totalVotes: number;
  seatResults: SeatResult[];
  flipped: FlippedSeat[];
  government: GovernmentOutcome;
  headline: string;
}
