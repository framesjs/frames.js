import type {
  ParseResult,
  SupportedParsingSpecification,
} from "./frame-parsers/types";
import { parseFramesWithReports } from "./parseFramesWithReports";

type GetFrameResult = ParseResult & {
  framesVersion?: string;
  framesDebugInfo?: {
    /**
     * Image URL of debug image.
     */
    image?: string;
  };
};

type GetFrameOptions = {
  htmlString: string;
  /**
   * Fallback url used if post_url is missing.
   */
  url: string;
  /**
   * @defaultValue 'farcaster'
   */
  specification?: SupportedParsingSpecification;
  /**
   * What was the request method used to fetch the frame.
   *
   * This changes how validation works, some properties aren't required for POST requests.
   *
   * @defaultValue 'GET'
   */
  fromRequestMethod?: "GET" | "POST";
};

/**
 * Extracts frame metadata from the given htmlString.
 *
 * @returns an object representing the parsing result
 */
export function getFrame({
  htmlString,
  specification = "farcaster",
  url,
  fromRequestMethod = "GET",
}: GetFrameOptions): GetFrameResult {
  const parsedFrames = parseFramesWithReports({
    fallbackPostUrl: url,
    html: htmlString,
    fromRequestMethod,
  });

  return {
    ...parsedFrames[specification],
    framesVersion: parsedFrames.framesVersion,
    ...(parsedFrames.framesDebugInfo
      ? { framesDebugInfo: parsedFrames.framesDebugInfo }
      : {}),
  };
}
