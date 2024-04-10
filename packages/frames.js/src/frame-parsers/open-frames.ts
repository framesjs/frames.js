/* eslint-disable @typescript-eslint/no-unnecessary-condition -- fallsBackToFarcaster is assigned if detected */
import type { CheerioAPI } from "cheerio";
import type { Frame } from "../types";
import { isValidVersion } from "../utils";
import type { ParseError, ParseResult, ParsedFrame } from "./types";
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

type Options = {
  farcasterFrame: Partial<Frame>;
};

type ParsedOpenFramesFrame = ParsedFrame & {
  accepts: { id: string; version: string }[];
};

export function parseOpenFramesFrame(
  $: CheerioAPI,
  { farcasterFrame }: Options
): ParseResult {
  const errors: Record<string, ParseError[]> = {};
  let fallsBackToFarcaster = false;
  let fallbackFrameData: Partial<Frame> = {};

  // parse accepts
  const accepts = $('meta[property^="of:accepts:"], meta[name^="of:accepts:"]')
    .toArray()
    .map((element) => {
      const property = element.attribs.property || element.attribs.name || "";
      const protocol = property.replace("of:accepts:", "");

      if (!protocol) {
        addError(errors, property, "Missing protocol id", "openframes");
      }

      if (protocol === "farcaster") {
        fallsBackToFarcaster = true;
      }

      return {
        id: protocol,
        version: element.attribs.content || "",
      };
    });

  if (accepts.length === 0) {
    addError(
      errors,
      "of:accepts:{protocol_identifier}",
      'At least one "of:accepts:{protocol_identifier}" meta tag is required',
      "openframes"
    );
  }

  if (fallsBackToFarcaster) {
    fallbackFrameData = farcasterFrame;
  }

  const parsedFrame: ParsedOpenFramesFrame = {
    accepts,
    version: getMetaTag($, "of:version"),
    image: getMetaTag($, "of:image", fallbackFrameData.image),
    ogImage: getMetaTag($, "og:image"),
    imageAspectRatio: getMetaTag(
      $,
      "of:image:aspect_ratio",
      fallbackFrameData.imageAspectRatio
    ),
    inputText: getMetaTag($, "of:input:text", fallbackFrameData.inputText),
    postUrl: getMetaTag($, "of:post_url"),
    state: getMetaTag($, "of:state", fallbackFrameData.state),
  };
  const frame: Partial<Frame> = {
    accepts,
  };

  if (!parsedFrame.version) {
    addError(
      errors,
      "of:version",
      'Missing required meta tag "of:version"',
      "openframes"
    );
  } else if (!isValidVersion(parsedFrame.version)) {
    addError(
      errors,
      "of:version",
      `Invalid version "${parsedFrame.version}"`,
      "openframes"
    );
  } else {
    frame.version = parsedFrame.version;
  }

  if (!parsedFrame.image) {
    addError(
      errors,
      "of:image",
      'Missing required meta tag "of:image"',
      "openframes"
    );
  } else {
    frame.image = validate(
      errors,
      "of:image",
      "openframes",
      validateFrameImage,
      parsedFrame.image
    );
  }

  if (!parsedFrame.ogImage) {
    addError(
      errors,
      "og:image",
      'Missing required meta tag "og:image"',
      "openframes"
    );
  } else {
    frame.ogImage = validate(
      errors,
      "og:image",
      "openframes",
      validateFrameImage,
      parsedFrame.ogImage
    );
  }

  if (parsedFrame.imageAspectRatio) {
    frame.imageAspectRatio = validate(
      errors,
      "of:image:aspect_ratio",
      "openframes",
      validateAspectRatio,
      parsedFrame.imageAspectRatio
    );
  }

  if (parsedFrame.inputText) {
    frame.inputText = validate(
      errors,
      "of:input:text",
      "openframes",
      validateInputText,
      parsedFrame.inputText
    );
  }

  if (parsedFrame.postUrl) {
    frame.postUrl = validate(
      errors,
      "of:post_url",
      "openframes",
      validateUrl,
      parsedFrame.postUrl,
      256
    );
  }

  if (parsedFrame.state) {
    frame.state = validate(
      errors,
      "of:state",
      "openframes",
      validateState,
      parsedFrame.state
    );
  }

  const parsedButtons = parseButtons($, errors, "openframes", "of:button");

  if (parsedButtons.length > 0) {
    frame.buttons = parsedButtons as typeof frame.buttons;
  }

  if (Object.keys(errors).length > 0) {
    return { frame, errors };
  }

  return {
    frame: frame as unknown as Frame,
  };
}
