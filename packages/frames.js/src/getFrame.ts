import type {
  ParseResult,
  SupportedParsingSpecification,
} from "./frame-parsers/types";
import { type SerializedNode } from "./middleware/jsx-utils";
import { parseFramesWithReports } from "./parseFramesWithReports";

type GetFrameResult = ParseResult & {
  framesVersion?: string;
  framesDebugInfo?: {
    jsx?: SerializedNode[];
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
}: GetFrameOptions): GetFrameResult {
  const parsedFrames = parseFramesWithReports({
    fallbackPostUrl: url,
    html: htmlString,
  });

  return {
    ...parsedFrames[specification],
    framesVersion: parsedFrames.framesVersion,
    ...(parsedFrames.framesDebugInfo?.jsx
      ? {
          framesDebugInfo: {
            jsx: JSON.parse(
              parsedFrames.framesDebugInfo.jsx
            ) as SerializedNode[],
          },
        }
      : {}),
  };
}
