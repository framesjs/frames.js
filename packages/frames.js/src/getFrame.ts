import type {
  SupportedParsingSpecification,
  ParseResultWithFrameworkDetails,
  ParseFramesV2ResultWithFrameworkDetails,
} from "./frame-parsers/types";
import { parseFramesWithReports } from "./parseFramesWithReports";

export type GetFrameResult =
  | ParseResultWithFrameworkDetails
  | ParseFramesV2ResultWithFrameworkDetails;

type GetFrameOptions = {
  htmlString: string;
  /**
   * URL to the frame.
   */
  frameUrl: string;
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
 * Parses the HTML and extracts frame information based on the specified protocol.
 *
 * @param options - Configuration options for frame extraction
 * @param options.htmlString - The HTML string to parse
 * @param options.frameUrl - URL to the frame
 * @param options.url - Fallback URL used if post_url is missing
 * @param options.specification - The parsing specification (default: 'farcaster')
 * @param options.fromRequestMethod - Request method used to fetch the frame (default: 'GET')
 * @returns An object representing the parsing result with frame data and any reports
 */
export async function getFrame({
  htmlString,
  frameUrl,
  specification = "farcaster",
  url,
  fromRequestMethod = "GET",
}: GetFrameOptions): Promise<GetFrameResult> {
  const parsedFrames = await parseFramesWithReports({
    frameUrl,
    fallbackPostUrl: url,
    html: htmlString,
    fromRequestMethod,
  });

  return parsedFrames[specification];
}
