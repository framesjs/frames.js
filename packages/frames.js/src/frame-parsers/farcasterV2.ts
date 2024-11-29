import type { CheerioAPI } from "cheerio";
import type { FrameV2 } from "../types";
import { getMetaTag } from "./utils";
import type { ParseResultFramesV2, ParsedFrameV2, Reporter } from "./types";

type Options = {
  reporter: Reporter;
};

// @todo add optional frame manifest validation?
// @todo add a way to turn on only some validations, for example manifest on, all the rest like image size off
export function parseFarcasterFrameV2(
  $: CheerioAPI,
  { reporter }: Options
): ParseResultFramesV2 {
  const embed = getMetaTag($, "fc:frame");

  if (!embed) {
    reporter.error("fc:frame", 'Missing required meta tag "fc:frame"');

    return {
      status: "failure",
      frame: {},
      reports: reporter.toObject(),
      specification: "farcaster_v2",
    };
  }

  let parsedJSON: unknown;
  const parsedFrame: ParsedFrameV2 = {};

  try {
    parsedJSON = JSON.parse(embed);
  } catch (error) {
    reporter.error(
      "fc:frame",
      "Failed to parse Frame, it is not a valid JSON value"
    );

    return {
      status: "failure",
      frame: {},
      reports: reporter.toObject(),
      specification: "farcaster_v2",
    };
  }

  if (typeof parsedJSON !== "object") {
    reporter.error("fc:frame", "Frame must be an object");

    return {
      status: "failure",
      frame: {},
      reports: reporter.toObject(),
      specification: "farcaster_v2",
    };
  }

  if (parsedJSON === null) {
    reporter.error("fc:frame", "Frame must not be null");

    return {
      status: "failure",
      frame: {},
      reports: reporter.toObject(),
      specification: "farcaster_v2",
    };
  }

  if (!("version" in parsedJSON)) {
    reporter.error("fc:frame", 'Missing required key "version" in Frame');
  } else if (typeof parsedJSON.version !== "string") {
    reporter.error("fc:frame", 'Key "version" in Frame must be a string');
  } else {
    parsedFrame.version = parsedJSON.version;
  }

  if (!("imageUrl" in parsedJSON)) {
    reporter.error("fc:frame", 'Missing required key "imageUrl" in Frame');
  } else if (typeof parsedJSON.imageUrl !== "string") {
    reporter.error("fc:frame", 'Key "imageUrl" in Frame must be a string');
  } else if (!URL.canParse(parsedJSON.imageUrl)) {
    reporter.error("fc:frame", 'Key "imageUrl" in Frame must be a valid URL');
  } else {
    parsedFrame.imageUrl = parsedJSON.imageUrl;
  }

  // @todo add optional validation for frame image size

  if (!("button" in parsedJSON)) {
    reporter.error("fc:frame", 'Missing required key "button" in Frame');
  } else {
    parsedFrame.button = parseFrameButton(parsedJSON.button, reporter);
  }

  if (reporter.hasErrors()) {
    return {
      status: "failure",
      frame: parsedFrame,
      reports: reporter.toObject(),
      specification: "farcaster_v2",
    };
  }

  return {
    status: "success",
    frame: parsedFrame as unknown as FrameV2,
    reports: reporter.toObject(),
    specification: "farcaster_v2",
  };
}

function parseFrameButton(
  parsedValue: unknown,
  reporter: Reporter
): ParsedFrameV2["button"] {
  if (typeof parsedValue !== "object") {
    reporter.error("fc:frame", 'Key "button" in Frame must be an object');

    return {};
  }

  if (parsedValue === null) {
    reporter.error("fc:frame", 'Key "button" in Frame must not be null');

    return {};
  }

  const button: ParsedFrameV2["button"] = {};

  if (!("title" in parsedValue)) {
    reporter.error("fc:frame", 'Missing required key "title" in Frame.button');
  } else if (typeof parsedValue.title !== "string") {
    reporter.error("fc:frame", 'Key "title" in Frame.button must be a string');
  } else {
    button.title = parsedValue.title;
  }

  if (!("action" in parsedValue)) {
    reporter.error("fc:frame", 'Missing required key "action" in Frame.button');
  } else {
    button.action = parseFrameButtonAction(parsedValue.action, reporter);
  }

  return button;
}

function parseFrameButtonAction(
  parsedValue: unknown,
  reporter: Reporter
): NonNullable<ParsedFrameV2["button"]>["action"] {
  if (typeof parsedValue !== "object") {
    reporter.error(
      "fc:frame",
      'Key "action" in Frame.button must be an object'
    );

    return {};
  }

  if (parsedValue === null) {
    reporter.error("fc:frame", 'Key "action" in Frame.button must not be null');

    return {};
  }

  const action: NonNullable<ParsedFrameV2["button"]>["action"] = {};

  if (!("name" in parsedValue)) {
    reporter.error(
      "fc:frame",
      'Missing required key "name" in Frame.button.action'
    );
  } else if (typeof parsedValue.name !== "string") {
    reporter.error(
      "fc:frame",
      'Key "name" in Frame.button.action must be a string'
    );
  } else {
    action.name = parsedValue.name;
  }

  if (!("type" in parsedValue)) {
    reporter.error(
      "fc:frame",
      'Missing required key "type" in Frame.button.action'
    );
  } else if (typeof parsedValue.type !== "string") {
    reporter.error(
      "fc:frame",
      'Key "type" in Frame.button.action must be a string'
    );
  } else if (parsedValue.type !== "launch_frame") {
    reporter.error(
      "fc:frame",
      'Key "type" in Frame.button.action must be "launch_frame"'
    );
  } else {
    action.type = parsedValue.type;
  }

  if (!("url" in parsedValue)) {
    reporter.error(
      "fc:frame",
      'Missing required key "url" in Frame.button.action'
    );
  } else if (typeof parsedValue.url !== "string") {
    reporter.error(
      "fc:frame",
      'Key "url" in Frame.button.action must be a string'
    );
  } else if (!URL.canParse(parsedValue.url)) {
    reporter.error(
      "fc:frame",
      'Key "url" in Frame.button.action must be a valid URL'
    );
  } else {
    action.url = parsedValue.url;
  }

  // @todo optionaly validate splashImage dimensions and file size
  if (!("splashImageUrl" in parsedValue)) {
    reporter.error(
      "fc:frame",
      'Missing required key "splashImageUrl" in Frame.button.action'
    );
  } else if (typeof parsedValue.splashImageUrl !== "string") {
    reporter.error(
      "fc:frame",
      'Key "splashImageUrl" in Frame.button.action must be a string'
    );
  } else if (!URL.canParse(parsedValue.splashImageUrl)) {
    reporter.error(
      "fc:frame",
      'Key "splashImageUrl" in Frame.button.action must be a valid URL'
    );
  } else {
    action.splashImageUrl = parsedValue.splashImageUrl;
  }

  if (!("splashBackgroundColor" in parsedValue)) {
    reporter.error(
      "fc:frame",
      'Missing required key "splashBackgroundColor" in Frame.button.action'
    );
  } else if (typeof parsedValue.splashBackgroundColor !== "string") {
    reporter.error(
      "fc:frame",
      'Key "splashBackgroundColor" in Frame.button.action must be a string'
    );
  } else if (!/^#[0-9a-fA-F]{6,8}$/.test(parsedValue.splashBackgroundColor)) {
    reporter.error(
      "fc:frame",
      'Key "splashBackgroundColor" in Frame.button.action must be a valid hex color'
    );
  } else {
    action.splashBackgroundColor = parsedValue.splashBackgroundColor;
  }

  return action;
}
