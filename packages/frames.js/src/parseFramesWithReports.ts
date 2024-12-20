import { load as loadDocument } from "cheerio";
import { createReporter } from "./frame-parsers/reporter";
import type {
  ParsedFrameworkDetails,
  ParseFramesWithReportsResult,
} from "./frame-parsers/types";
import { parseFarcasterFrame } from "./frame-parsers/farcaster";
import { parseOpenFramesFrame } from "./frame-parsers/open-frames";
import { FRAMESJS_DEBUG_INFO_IMAGE_KEY } from "./constants";
import {
  parseFarcasterFrameV2,
  type ParseFarcasterFrameV2ValidationSettings,
} from "./frame-parsers/farcasterV2";

type ParseFramesWithReportsOptions = {
  html: string;
  frameUrl: string;
  /**
   * URL used if frame doesn't contain a post_url meta tag.
   */
  fallbackPostUrl: string;
  /**
   * What was the request method used to fetch the frame.
   *
   * This changes how validation works, some properties aren't required for POST requests.
   *
   * @defaultValue 'GET'
   */
  fromRequestMethod?: "GET" | "POST";
  /**
   * Control parse settings
   */
  parseSettings?: {
    farcaster_v2?: ParseFarcasterFrameV2ValidationSettings;
  };
};

/**
 * Gets all supported frames and validation their respective validation reports.
 */
export async function parseFramesWithReports({
  html,
  frameUrl,
  fallbackPostUrl,
  fromRequestMethod = "GET",
  parseSettings,
}: ParseFramesWithReportsOptions): Promise<ParseFramesWithReportsResult> {
  const farcasterReporter = createReporter("farcaster");
  const farcasterV2Reporter = createReporter("farcaster_v2");
  const openFramesReporter = createReporter("openframes");
  const document = loadDocument(html);

  const farcaster = parseFarcasterFrame(document, {
    reporter: farcasterReporter,
    fallbackPostUrl,
    fromRequestMethod,
  });

  const farcasterV2 = await parseFarcasterFrameV2(document, {
    ...parseSettings?.farcaster_v2,
    reporter: farcasterV2Reporter,
    frameUrl,
  });

  const framesVersion = document(
    "meta[name='frames.js:version'], meta[property='frames.js:version']"
  ).attr("content");

  const debugImageUrl = document(
    `meta[name="${FRAMESJS_DEBUG_INFO_IMAGE_KEY}"], meta[property="${FRAMESJS_DEBUG_INFO_IMAGE_KEY}"]`
  ).attr("content");

  const openframes = parseOpenFramesFrame(document, {
    farcasterFrame: farcaster.frame,
    reporter: openFramesReporter,
    fallbackPostUrl,
    fromRequestMethod,
  });

  const frameworkDetails: ParsedFrameworkDetails = {
    framesVersion,
    ...(debugImageUrl
      ? {
          framesDebugInfo: {
            image: debugImageUrl,
          },
        }
      : {}),
  };

  return {
    farcaster: {
      ...farcaster,
      ...frameworkDetails,
    },
    farcaster_v2: {
      ...farcasterV2,
      ...frameworkDetails,
    },
    openframes: {
      ...openframes,
      ...frameworkDetails,
    },
  };
}
