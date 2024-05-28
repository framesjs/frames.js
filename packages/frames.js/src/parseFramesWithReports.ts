import { load as loadDocument } from "cheerio";
import { createReporter } from "./frame-parsers/reporter";
import type {
  ParseResult,
  SupportedParsingSpecification,
} from "./frame-parsers/types";
import { parseFarcasterFrame } from "./frame-parsers/farcaster";
import { parseOpenFramesFrame } from "./frame-parsers/open-frames";
import { FRAMESJS_DEBUG_INFO_JSX_KEY } from "./constants";

type ParseFramesWithReportsOptions = {
  html: string;
  /**
   * URL used if frame doesn't contain a post_url meta tag.
   */
  fallbackPostUrl: string;
};

export type ParseFramesWithReportsResult = {
  [K in SupportedParsingSpecification]: ParseResult;
} & {
  framesVersion?: string;
  framesDebugInfo?: {
    jsx?: string;
  };
};

/**
 * Gets all supported frames and validation their respective validation reports.
 */
export function parseFramesWithReports({
  html,
  fallbackPostUrl,
}: ParseFramesWithReportsOptions): ParseFramesWithReportsResult {
  const farcasterReporter = createReporter("farcaster");
  const openFramesReporter = createReporter("openframes");
  const document = loadDocument(html);

  const farcaster = parseFarcasterFrame(document, {
    reporter: farcasterReporter,
    fallbackPostUrl,
  });

  const framesVersion = document(
    "meta[name='frames.js:version'], meta[property='frames.js:version']"
  ).attr("content");

  const debugImageJsx = document(
    `meta[name="${FRAMESJS_DEBUG_INFO_JSX_KEY}"], meta[property="${FRAMESJS_DEBUG_INFO_JSX_KEY}"]`
  ).attr("content");

  return {
    farcaster,
    openframes: parseOpenFramesFrame(document, {
      farcasterFrame: farcaster.frame,
      reporter: openFramesReporter,
      fallbackPostUrl,
    }),
    framesVersion,
    ...(debugImageJsx
      ? {
          framesDebugInfo: {
            jsx: debugImageJsx,
          },
        }
      : {}),
  };
}
