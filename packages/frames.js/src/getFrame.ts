import * as cheerio from "cheerio";
import type { Frame } from "./types";
import { parseFarcasterFrame } from "./frame-parsers/farcaster";
import { parseOpenFramesFrame } from "./frame-parsers/open-frames";
import type { ParsingReport } from "./frame-parsers/types";
import { mergeErrors } from "./frame-parsers/utils";
import { createReporter } from "./frame-parsers/reporter";

type GetFrameResult =
  | { frame: Frame }
  | { frame: Partial<Frame>; reports: Record<string, ParsingReport[]> };

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
  const farcasterFrame = parseFarcasterFrame($, { reporter });
  const openFramesFrame = parseOpenFramesFrame($, {
    farcasterFrame: farcasterFrame.frame,
    reporter: openFramesReporter,
  });
  const pageTitle = $("title").text();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- just in case
  if (pageTitle === undefined) {
    reporter.warn(
      "<title>",
      "A <title> tag is required in order for your frames to work in Warpcast"
    );
  }

  // Future:
  // todo: might need to consider validating that there aren't too many of something, like images
  // todo: validate image dimensions, filetype, size  const image = await fetch(image){}
  // todo: validate post_url is a valid url
  if ("reports" in farcasterFrame || "reporter" in openFramesFrame) {
    return {
      // merge both frame messages to one with farcaster taking precedence
      frame: {
        accepts: openFramesFrame.frame.accepts,
        buttons: farcasterFrame.frame.buttons || openFramesFrame.frame.buttons,
        image: farcasterFrame.frame.image || openFramesFrame.frame.image,
        imageAspectRatio:
          farcasterFrame.frame.imageAspectRatio ||
          openFramesFrame.frame.imageAspectRatio,
        inputText:
          farcasterFrame.frame.inputText || openFramesFrame.frame.inputText,
        ogImage: farcasterFrame.frame.ogImage || openFramesFrame.frame.ogImage,
        postUrl:
          farcasterFrame.frame.postUrl || openFramesFrame.frame.postUrl || url,
        state: farcasterFrame.frame.state || openFramesFrame.frame.state,
        version: farcasterFrame.frame.version || openFramesFrame.frame.version,
      },
      reports: {
        ...mergeErrors(
          "reports" in farcasterFrame ? farcasterFrame.reports : undefined,
          "reports" in openFramesFrame ? openFramesFrame.reports : undefined
        ),
      },
    };
  }

  // return whichever frame is valid (farcaster takes precedence)
  if (!("reports" in farcasterFrame)) {
    return {
      frame: {
        ...farcasterFrame.frame,
        accepts: openFramesFrame.frame.accepts,
      },
    };
  }

  return openFramesFrame;
}
