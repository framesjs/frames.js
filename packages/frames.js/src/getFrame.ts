import * as cheerio from "cheerio";
import type { Frame } from "./types";
import { parseFarcasterFrame } from "./frame-parsers/farcaster";
import { parseOpenFramesFrame } from "./frame-parsers/open-frames";
import type { ParseError } from "./frame-parsers/types";
import { mergeErrors } from "./frame-parsers/utils";

type GetFrameResult =
  | { frame: Frame }
  | { frame: Partial<Frame>; errors: Record<string, ParseError[]> };

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

  const farcasterFrame = parseFarcasterFrame($);
  const openFramesFrame = parseOpenFramesFrame($, {
    farcasterFrame: farcasterFrame.frame,
  });
  let errors: Record<string, ParseError[]> | undefined;
  const pageTitle = $("title").text();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- just in case
  if (pageTitle === undefined) {
    errors = {
      title: [
        {
          message:
            "A <title> tag is required in order for your frames to work in Warpcast",
          source: "farcaster",
        },
      ],
    };
  }

  // Future:
  // todo: might need to consider validating that there aren't too many of something, like images
  // todo: validate image dimensions, filetype, size  const image = await fetch(image){}
  // todo: validate post_url is a valid url
  if ("errors" in farcasterFrame || "errors" in openFramesFrame || errors) {
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
      errors: {
        ...errors,
        ...mergeErrors(
          "errors" in farcasterFrame ? farcasterFrame.errors : undefined,
          "errors" in openFramesFrame ? openFramesFrame.errors : undefined
        ),
      },
    };
  }

  // return whichever frame is valid (farcaster takes precedence)
  if (!("error" in farcasterFrame)) {
    return {
      frame: {
        ...farcasterFrame.frame,
        accepts: openFramesFrame.frame.accepts,
      },
    };
  }

  return openFramesFrame;
}
