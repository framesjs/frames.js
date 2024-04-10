import type { CheerioAPI } from "cheerio";
import type { Frame } from "../types";
import { isValidVersion } from "../utils";
import {
  addError,
  getMetaTag,
  parseButtons,
  validate,
  validateAspectRatio,
  validateFrameImage,
  validateInputText,
  validateState,
  validateUrl,
} from "./utils";
import type { ParseError, ParseResult, ParsedFrame } from "./types";

export function parseFarcasterFrame($: CheerioAPI): ParseResult {
  const errors: Record<string, ParseError[]> = {};
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
    addError(
      errors,
      "fc:frame",
      'Missing required meta tag "fc:frame"',
      "farcaster"
    );
  } else if (!isValidVersion(parsedFrame.version)) {
    addError(
      errors,
      "fc:frame",
      `Invalid version "${parsedFrame.version}"`,
      "farcaster"
    );
  } else {
    frame.version = parsedFrame.version;
  }

  if (!parsedFrame.image) {
    addError(
      errors,
      "fc:frame:image",
      'Missing required meta tag "fc:frame:image"',
      "farcaster"
    );
  } else {
    frame.image = validate(
      errors,
      "fc:frame:image",
      "farcaster",
      validateFrameImage,
      parsedFrame.image
    );
  }

  if (!parsedFrame.ogImage) {
    addError(
      errors,
      "og:image",
      'Missing required meta tag "og:image"',
      "farcaster"
    );
  } else {
    frame.ogImage = validate(
      errors,
      "og:image",
      "farcaster",
      validateFrameImage,
      parsedFrame.ogImage
    );
  }

  if (parsedFrame.imageAspectRatio) {
    frame.imageAspectRatio = validate(
      errors,
      "fc:frame:image:aspect_ratio",
      "farcaster",
      validateAspectRatio,
      parsedFrame.imageAspectRatio
    );
  }

  if (parsedFrame.inputText) {
    frame.inputText = validate(
      errors,
      "fc:frame:input:text",
      "farcaster",
      validateInputText,
      parsedFrame.inputText
    );
  }

  if (parsedFrame.postUrl) {
    frame.postUrl = validate(
      errors,
      "fc:frame:post_url",
      "farcaster",
      validateUrl,
      parsedFrame.postUrl,
      256
    );
  }

  if (parsedFrame.state) {
    frame.state = validate(
      errors,
      "fc:frame:state",
      "farcaster",
      validateState,
      parsedFrame.state
    );
  }

  const parsedButtons = parseButtons($, errors, "farcaster", "fc:frame:button");

  if (parsedButtons.length > 0) {
    frame.buttons = parsedButtons as typeof frame.buttons;
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      frame,
    };
  }

  return {
    frame: frame as unknown as Frame,
  };
}
