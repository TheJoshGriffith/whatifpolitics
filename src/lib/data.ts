/**
 * Single place where the JSON in src/data/ is loaded and typed.
 * Regenerate it with `python3 scripts/build-data.py`.
 */
import sourcesJson from "../data/sources.json";
import { events } from "../data/events";
import type { ElectionEvent, SourcesFile } from "./types";
import type { ModelInput } from "./engine";

const sourcesFile = sourcesJson as unknown as SourcesFile;

export { events };
export const sources = sourcesFile.sources;
export const isPlaceholder = false;
/** The most recent real vote (the polling projection, listed first, is not the default). */
export const defaultEvent = events.find((e) => !e.projection) ?? events[0];

export function getEvent(id: string): ElectionEvent {
  return events.find((e) => e.id === id) ?? defaultEvent;
}

export function modelInputFor(e: ElectionEvent): ModelInput {
  return { parties: e.parties, dimensions: e.dimensions, constituencies: e.constituencies, groupVoting: e.groupVoting };
}

/** The 2024 general election, kept for tests and older code. */
const ge2024 = getEvent("ge2024");
export const parties = ge2024.parties;
export const dimensions = ge2024.dimensions;
export const constituencies = ge2024.constituencies;
export const groupVoting = ge2024.groupVoting;
export const modelInput: ModelInput = modelInputFor(ge2024);
