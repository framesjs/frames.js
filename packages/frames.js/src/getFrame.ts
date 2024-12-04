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
 *
 * @returns an object representing the parsing result
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
