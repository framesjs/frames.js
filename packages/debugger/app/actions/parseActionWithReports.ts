import { parseFarcasterAction } from "./farcaster";
import { createReporter } from "./parsing";
import { ParseActionResult } from "./types";
type ParseActionsWithReportsOptions = {
  actionMetadata: object;
};

export type ParseActionsWithReportsResult = {
  farcaster: ParseActionResult;
};

/**
 * Gets all supported actions and validations their respective validation reports.
 */
export function parseActionsWithReports({
  actionMetadata,
}: ParseActionsWithReportsOptions): ParseActionsWithReportsResult {
  const farcasterReporter = createReporter("farcaster");

  const farcaster = parseFarcasterAction(actionMetadata, farcasterReporter);

  return {
    farcaster,
  };
}
