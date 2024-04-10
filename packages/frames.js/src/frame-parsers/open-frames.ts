/* eslint-disable @typescript-eslint/no-unnecessary-condition -- fallsBackToFarcaster is assigned if detected */
import type { CheerioAPI } from "cheerio";
import type { Frame } from "../types";
import { isValidVersion } from "../utils";
import type { ParseResult, ParsedFrame, Reporter } from "./types";
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

type Options = {
  farcasterFrame: Partial<Frame>;
  reporter: Reporter;
};

type ParsedOpenFramesFrame = ParsedFrame & {
  accepts: { id: string; version: string }[];
};

export function parseOpenFramesFrame(
  $: CheerioAPI,
  { farcasterFrame, reporter }: Options
): ParseResult {
  let fallsBackToFarcaster = false;
  let fallbackFrameData: Partial<Frame> = {};

  // parse accepts
  const accepts = $('meta[property^="of:accepts:"], meta[name^="of:accepts:"]')
    .toArray()
    .map((element) => {
      const property = element.attribs.property || element.attribs.name || "";
      const protocol = property.replace("of:accepts:", "");

      if (!protocol) {
        reporter.error(property, "Missing protocol id");
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
    reporter.error(
      "of:accepts:{protocol_identifier}",
      'At least one "of:accepts:{protocol_identifier}" meta tag is required'
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
    reporter.error("of:version", 'Missing required meta tag "of:version"');
  } else if (!isValidVersion(parsedFrame.version)) {
    reporter.error("of:version", `Invalid version "${parsedFrame.version}"`);
  } else {
    frame.version = parsedFrame.version;
  }

  if (!parsedFrame.image) {
    reporter.error("of:image", 'Missing required meta tag "of:image"');
  } else {
    frame.image = validate(
      reporter,
      "of:image",
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
      "of:image:aspect_ratio",
      validateAspectRatio,
      parsedFrame.imageAspectRatio
    );
  }

  if (parsedFrame.inputText) {
    frame.inputText = validate(
      reporter,
      "of:input:text",
      validateInputText,
      parsedFrame.inputText
    );
  }

  if (parsedFrame.postUrl) {
    frame.postUrl = validate(
      reporter,
      "of:post_url",
      validateUrl,
      parsedFrame.postUrl,
      256
    );
  }

  if (parsedFrame.state) {
    frame.state = validate(
      reporter,
      "of:state",
      validateState,
      parsedFrame.state
    );
  }

  const parsedButtons = parseButtons($, reporter, "of:button");

  if (parsedButtons.length > 0) {
    frame.buttons = parsedButtons as typeof frame.buttons;
  }

  if (reporter.hasReports()) {
    return { frame, reports: reporter.toObject() };
  }

  return {
    frame: frame as unknown as Frame,
  };
}
