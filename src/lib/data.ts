/**
 * Single place where the JSON in src/data/ is loaded and typed.
 * Swap the JSON files for real data; nothing else needs to change.
 */
import partiesJson from "../data/parties.json";
import dimensionsJson from "../data/dimensions.json";
import constituenciesJson from "../data/constituencies.json";
import groupVotingJson from "../data/groupVoting.json";
import sourcesJson from "../data/sources.json";
import type {
  ConstituenciesFile,
  DimensionsFile,
  GroupVotingFile,
  PartiesFile,
  SourcesFile,
} from "./types";
import type { ModelInput } from "./engine";

const partiesFile = partiesJson as unknown as PartiesFile;
const dimensionsFile = dimensionsJson as unknown as DimensionsFile;
const constituenciesFile = constituenciesJson as unknown as ConstituenciesFile;
const groupVotingFile = groupVotingJson as unknown as GroupVotingFile;
const sourcesFile = sourcesJson as unknown as SourcesFile;

export const parties = partiesFile.parties;
export const dimensions = dimensionsFile.dimensions;
export const constituencies = constituenciesFile.constituencies;
export const groupVoting = groupVotingFile.groupVoting;
export const sources = sourcesFile.sources;

/** true if ANY data file is still placeholder — the UI shows a banner. */
export const isPlaceholder = [
  partiesFile,
  dimensionsFile,
  constituenciesFile,
  groupVotingFile,
  sourcesFile,
].some((f) => f.placeholder);

export const modelInput: ModelInput = { parties, dimensions, constituencies, groupVoting };
