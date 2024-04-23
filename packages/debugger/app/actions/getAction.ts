import { parseActionsWithReports } from "./parseActionWithReports";
import { ParseActionResult } from "./types";

/**
 * Extracts action metadata from the given json object.
 *
 * @returns an object representing the parsing result
 */
export function getAction({
  json,
  specification = "farcaster",
}: {
  json: object;
  specification: "farcaster";
}): ParseActionResult {
  const parsedActions = parseActionsWithReports({ actionMetadata: json });

  return parsedActions[specification];
}
