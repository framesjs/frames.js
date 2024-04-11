import * as cheerio from "cheerio";
import type { Frame } from "./types";
import { parseFarcasterFrame } from "./frame-parsers/farcaster";
import { parseOpenFramesFrame } from "./frame-parsers/open-frames";
import type { ParsingReport } from "./frame-parsers/types";
import { createReporter } from "./frame-parsers/reporter";

type FrameResult =
  | { frame: Frame }
  | { frame: Partial<Frame>; reports: Record<string, ParsingReport[]> };

type GetFrameResult = {
  farcaster: FrameResult;
  openframes: FrameResult;
};

/**
 * @returns an object, extracting the frame metadata from the given htmlString.
 * If the Frame fails validation, the `errors` object will be non-null
 */
export function getFrame({
  htmlString,
  url,
}: {
  htmlString: string;
  url: string;
}): GetFrameResult {
  const $ = cheerio.load(htmlString);
  const reporter = createReporter("farcaster");
  const openFramesReporter = createReporter("openframes");
  const pageTitle = $("title").text();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- just in case
  if (!pageTitle) {
    reporter.warn(
      "<title>",
      "A <title> tag is required in order for your frames to work in Warpcast"
    );
    openFramesReporter.warn(
      "<title>",
      "A <title> tag is required in order for your frames to work in Warpcast"
    );
  }

  const farcasterFrame = parseFarcasterFrame($, {
    reporter,
    fallbackPostUrl: url,
  });
  const openFramesFrame = parseOpenFramesFrame($, {
    farcasterFrame: farcasterFrame.frame,
    reporter: openFramesReporter,
    fallbackPostUrl: url,
  });

  return {
    farcaster: farcasterFrame,
    openframes: openFramesFrame,
  };
}
