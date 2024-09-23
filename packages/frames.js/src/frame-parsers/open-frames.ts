/* eslint-disable @typescript-eslint/no-unnecessary-condition -- fallsBackToFarcaster is assigned if detected */
import type { CheerioAPI } from "cheerio";
import type { Frame } from "../types";
import { isValidVersion } from "../utils";
import { DEFAULT_FRAME_TITLE } from "../constants";
import type { ParseResult, ParsedFrame, Reporter } from "./types";
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

type Options = {
  farcasterFrame: Partial<Frame>;
  reporter: Reporter;
  fallbackPostUrl: string;
  /**
   * @defaultValue 'GET'
   */
  fromRequestMethod?: "GET" | "POST";
};

type ParsedOpenFramesFrame = ParsedFrame & {
  accepts: { id: string; version: string }[];
};

export function parseOpenFramesFrame(
  $: CheerioAPI,
  {
    fallbackPostUrl,
    farcasterFrame,
    reporter,
    fromRequestMethod = "GET",
  }: Options
): ParseResult {
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

  fallbackFrameData = farcasterFrame;

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
    postUrl:
      getMetaTag($, "of:post_url") ??
      fallbackFrameData.postUrl ??
      fallbackPostUrl,
    state: getMetaTag($, "of:state", fallbackFrameData.state),
    title: getMetaTag($, "og:title") || getTagText($, "title"),
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

  const parsedButtonsOf = parseButtons($, reporter, "of:button");

  const parsedButtons =
    fallbackFrameData.buttons &&
    fallbackFrameData.buttons?.length > parsedButtonsOf.length
      ? fallbackFrameData.buttons
      : parsedButtonsOf;

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
