import type { CheerioAPI } from "cheerio";
import type { Frame } from "../types";
import { isValidVersion } from "../utils";
import {
  getMetaTag,
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
};

export function parseFarcasterFrame(
  $: CheerioAPI,
  { reporter }: Options
): ParseResult {
  const parsedFrame: ParsedFrame = {
    version: getMetaTag($, "fc:frame"),
    ogImage: getMetaTag($, "og:image"),
    image: getMetaTag($, "fc:frame:image"),
    imageAspectRatio: getMetaTag($, "fc:frame:image:aspect_ratio"),
    inputText: getMetaTag($, "fc:frame:input:text"),
    postUrl: getMetaTag($, "fc:frame:post_url"),
    state: getMetaTag($, "fc:frame:state"),
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
    reporter.error("og:image", 'Missing required meta tag "og:image"');
  } else {
    frame.ogImage = validate(
      reporter,
      "og:image",
      validateFrameImage,
      parsedFrame.ogImage
    );
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

  if (reporter.hasReports()) {
    return {
      reports: reporter.toObject(),
      frame,
    };
  }

  return {
    frame: frame as unknown as Frame,
  };
}
