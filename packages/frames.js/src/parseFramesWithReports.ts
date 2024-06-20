import { load as loadDocument } from "cheerio";
import { createReporter } from "./frame-parsers/reporter";
import type {
  ParseResult,
  SupportedParsingSpecification,
} from "./frame-parsers/types";
import { parseFarcasterFrame } from "./frame-parsers/farcaster";
import { parseOpenFramesFrame } from "./frame-parsers/open-frames";
import { FRAMESJS_DEBUG_INFO_IMAGE_KEY } from "./constants";

type ParseFramesWithReportsOptions = {
  html: string;
  /**
   * URL used if frame doesn't contain a post_url meta tag.
   */
  fallbackPostUrl: string;
  /**
   * If true, a warning will be reported if the title is missing.
   *
   * @defaultValue false
   */
  warnOnMissingTitle?: boolean;
};

export type ParseFramesWithReportsResult = {
  [K in SupportedParsingSpecification]: ParseResult;
} & {
  framesVersion?: string;
  framesDebugInfo?: {
    /**
     * Image URL of debug image.
     */
    image?: string;
  };
};

/**
 * Gets all supported frames and validation their respective validation reports.
 */
export function parseFramesWithReports({
  html,
  fallbackPostUrl,
  warnOnMissingTitle = false,
}: ParseFramesWithReportsOptions): ParseFramesWithReportsResult {
  const farcasterReporter = createReporter("farcaster");
  const openFramesReporter = createReporter("openframes");
  const document = loadDocument(html);

  const farcaster = parseFarcasterFrame(document, {
    reporter: farcasterReporter,
    fallbackPostUrl,
    warnOnMissingTitle,
  });

  const framesVersion = document(
    "meta[name='frames.js:version'], meta[property='frames.js:version']"
  ).attr("content");

  const debugImageUrl = document(
    `meta[name="${FRAMESJS_DEBUG_INFO_IMAGE_KEY}"], meta[property="${FRAMESJS_DEBUG_INFO_IMAGE_KEY}"]`
  ).attr("content");

  return {
    farcaster,
    openframes: parseOpenFramesFrame(document, {
      farcasterFrame: farcaster.frame,
      reporter: openFramesReporter,
      fallbackPostUrl,
      warnOnMissingTitle,
    }),
    framesVersion,
    ...(debugImageUrl
      ? {
          framesDebugInfo: {
            image: debugImageUrl,
          },
        }
      : {}),
  };
}
