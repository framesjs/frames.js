import type { CheerioAPI } from "cheerio";
import type { Frame } from "../types";
import { isValidVersion } from "../utils";
import { DEFAULT_FRAME_TITLE } from "../constants";
import {
  getMetaTag,
  getTagText,
  parseButtons,
  validate,
  validateAspectRatio,
  validateFrameImage,
  validateInputText,
  validateState,
  validateUrl,
} from "./utils";
import type { ParseResult, ParsedFrame, Reporter } from "./types";

type Options = {
  reporter: Reporter;
  fallbackPostUrl: string;
  /**
   * @defaultValue 'GET'
   */
  fromRequestMethod?: "GET" | "POST";
};

export function parseFarcasterFrame(
  $: CheerioAPI,
  { fallbackPostUrl, reporter, fromRequestMethod = "GET" }: Options
): ParseResult {
  const parsedFrame: ParsedFrame = {
    version: getMetaTag($, "fc:frame"),
    ogImage: getMetaTag($, "og:image"),
    image: getMetaTag($, "fc:frame:image"),
    imageAspectRatio: getMetaTag($, "fc:frame:image:aspect_ratio"),
    inputText: getMetaTag($, "fc:frame:input:text"),
    postUrl: getMetaTag($, "fc:frame:post_url") ?? fallbackPostUrl,
    state: getMetaTag($, "fc:frame:state"),
    title: getMetaTag($, "og:title") || getTagText($, "title"),
  };
  const frame: Partial<Frame> = {};

  // validate version
  if (!parsedFrame.version) {
    reporter.error("fc:frame", 'Missing required meta tag "fc:frame"');
  } else if (!isValidVersion(parsedFrame.version)) {
    reporter.error("fc:frame", `Invalid version "${parsedFrame.version}"`);
  } else {
    frame.version = parsedFrame.version;
  }

  if (!parsedFrame.image) {
    reporter.error(
      "fc:frame:image",
      'Missing required meta tag "fc:frame:image"'
    );
  } else {
    frame.image = validate(
      reporter,
      "fc:frame:image",
      validateFrameImage,
      parsedFrame.image
    );
  }

  if (!parsedFrame.ogImage) {
    if (fromRequestMethod === "GET") {
      reporter.warn("og:image", 'Missing meta tag "og:image"');
    }
  } else {
    try {
      frame.ogImage = validateFrameImage(parsedFrame.ogImage);
    } catch (error) {
      if (error instanceof Error) {
        reporter.warn("og:image", error.message);
      }
    }
  }

  if (!parsedFrame.title) {
    if (fromRequestMethod === "GET") {
      reporter.warn(
        "title",
        'Missing title, please provide <title> or <meta property="og:title"> tag.'
      );
    }
  } else if (parsedFrame.title === DEFAULT_FRAME_TITLE) {
    if (fromRequestMethod === "GET") {
      reporter.warn(
        "title",
        `It seems the frame uses default title "${DEFAULT_FRAME_TITLE}" provided by Frames.js`
      );
    }
  } else {
    frame.title = parsedFrame.title;
  }

  if (parsedFrame.imageAspectRatio) {
    frame.imageAspectRatio = validate(
      reporter,
      "fc:frame:image:aspect_ratio",
      validateAspectRatio,
      parsedFrame.imageAspectRatio
    );
  }

  if (parsedFrame.inputText) {
    frame.inputText = validate(
      reporter,
      "fc:frame:input:text",
      validateInputText,
      parsedFrame.inputText
    );
  }

  if (parsedFrame.postUrl) {
    frame.postUrl = validate(
      reporter,
      "fc:frame:post_url",
      validateUrl,
      parsedFrame.postUrl,
      256
    );
  }

  if (parsedFrame.state) {
    frame.state = validate(
      reporter,
      "fc:frame:state",
      validateState,
      parsedFrame.state
    );
  }

  const parsedButtons = parseButtons($, reporter, "fc:frame:button");

  if (parsedButtons.length > 0) {
    frame.buttons = parsedButtons as typeof frame.buttons;
  }

  if (reporter.hasErrors()) {
    return {
      status: "failure",
      frame,
      reports: reporter.toObject(),
    };
  }

  return {
    status: "success",
    frame: frame as unknown as Frame,
    reports: reporter.toObject(),
  };
}
