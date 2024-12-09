import type { CheerioAPI } from "cheerio";
import type { PartialDeep } from "type-fest";
import type {
  FarcasterManifest,
  Frame,
  PartialFarcasterManifest,
} from "../farcaster-v2/types";
import { decodePayload, verify } from "../farcaster-v2/json-signature";
import { getMetaTag } from "./utils";
import type {
  ParseResultFramesV2,
  ParseResultFramesV2FrameManifest,
  ParsedFrameV2,
  Reporter,
} from "./types";
import { createReporter } from "./reporter";

export type ParseFarcasterFrameV2ValidationSettings = {
  /**
   * Enable/disable frame manifest parsing.
   *
   * @see https://docs.farcaster.xyz/developers/frames/v2/spec#frame-manifest
   *
   * @defaultValue false
   */
  parseManifest?: boolean;
};

type ParseFarcasterFrameV2Options = {
  /**
   * URL of the frame
   *
   * This is used for manifest validation.
   */
  frameUrl: string;
  reporter: Reporter;
} & ParseFarcasterFrameV2ValidationSettings;

export async function parseFarcasterFrameV2(
  $: CheerioAPI,
  {
    frameUrl,
    reporter,
    parseManifest: parseManifestEnabled = false,
  }: ParseFarcasterFrameV2Options
): Promise<ParseResultFramesV2> {
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
    frame: parsedFrame as unknown as Frame,
    reports: reporter.toObject(),
    specification: "farcaster_v2",
    manifest: parseManifestEnabled ? await parseManifest(frameUrl) : undefined,
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

async function parseManifest(
  frameUrl: string
): Promise<ParseResultFramesV2FrameManifest> {
  const reporter = createReporter("farcaster_v2");
  // load manifest from well known URI
  try {
    const manifestResponse = await fetch(
      new URL("/.well-known/farcaster.json", frameUrl),
      {
        method: "GET",
        cache: "no-cache",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!manifestResponse.ok) {
      reporter.error(
        "fc:manifest",
        `Failed to fetch frame manifest, status code: ${manifestResponse.status}`
      );

      return {
        status: "failure",
        manifest: {},
        reports: reporter.toObject(),
      };
    }

    const body: unknown = await manifestResponse.json();
    const manifest = parseManifestData(body, reporter);

    if (!reporter.hasErrors()) {
      await verifyManifestAccountAssociation(
        manifest as unknown as FarcasterManifest,
        frameUrl,
        reporter
      );
    }

    if (reporter.hasErrors()) {
      return {
        status: "failure",
        manifest,
        reports: reporter.toObject(),
      };
    }

    return {
      status: "success",
      manifest: manifest as unknown as FarcasterManifest,
      reports: reporter.toObject(),
    };
  } catch (e) {
    if (e instanceof Error) {
      reporter.error(
        "fc:manifest",
        `Failed to parse frame manifest: ${String(e)}`
      );
    } else {
      const message = String(e);

      if (message.startsWith("SyntaxError")) {
        reporter.error(
          "fc:manifest",
          "Failed to parse frame manifest, it is not a valid JSON value"
        );
      } else {
        reporter.error(
          "fc:manifest",
          `Failed to fetch frame manifest: ${message}`
        );
      }
    }

    return {
      status: "failure",
      manifest: {},
      reports: reporter.toObject(),
    };
  }
}

async function verifyManifestAccountAssociation(
  manifest: FarcasterManifest,
  frameUrl: string,
  reporter: Reporter
): Promise<void> {
  const domain = new URL(frameUrl).hostname;

  const isValid = await verify(manifest.accountAssociation);

  if (!isValid) {
    reporter.error(
      "fc:manifest",
      "Failed to verify account association signature"
    );
    return;
  }

  const parsedPayload = decodePayload(manifest.accountAssociation.payload);

  if (typeof parsedPayload !== "object" || parsedPayload === null) {
    reporter.error(
      "fc:manifest",
      "Failed to parse account association payload"
    );
    return;
  }

  if (!("domain" in parsedPayload)) {
    reporter.error(
      "fc:manifest",
      "Missing required property 'domain' in account association payload"
    );
  } else if (typeof parsedPayload.domain !== "string") {
    reporter.error(
      "fc:manifest",
      "Account association payload domain must be a string"
    );
  } else if (parsedPayload.domain !== domain) {
    reporter.error(
      "fc:manifest",
      "Account association payload domain must match the frame URL"
    );
  }
}

function parseManifestData(
  data: unknown,
  reporter: Reporter
): PartialFarcasterManifest {
  if (typeof data !== "object" || data === null) {
    reporter.error("fc:manifest", "Manifest must be an object");

    return {};
  }

  const parsedManifest: PartialFarcasterManifest = {};

  parseManifestDataAccountAssociation(parsedManifest, data, reporter);
  parseManifestDataFrameConfig(parsedManifest, data, reporter);
  parseManifestDataTriggers(parsedManifest, data, reporter);

  return parsedManifest;
}

/**
 * This function mutates the manifest object
 */
function parseManifestDataAccountAssociation(
  parsedManifest: PartialFarcasterManifest,
  data: object,
  reporter: Reporter
): void {
  if (!("accountAssociation" in data)) {
    reporter.error(
      "fc:manifest",
      'Missing required property "accountAssociation" in manifest'
    );

    return;
  } else if (
    typeof data.accountAssociation !== "object" ||
    data.accountAssociation === null
  ) {
    reporter.error(
      "fc:manifest.accountAssociation",
      "Account association must be an object"
    );

    return;
  }

  const accountAssociation = data.accountAssociation;
  const parsedAccountAssociation: PartialDeep<
    FarcasterManifest["accountAssociation"]
  > = {};

  for (const property of [
    "header",
    "payload",
    "signature",
  ] as (keyof FarcasterManifest["accountAssociation"])[]) {
    if (!(property in accountAssociation)) {
      reporter.error(
        `fc:manifest.accountAssociation.${property}`,
        `Missing required property "${property}" in account association`
      );

      continue;
    }

    const value = (accountAssociation as Record<string, unknown>)[property];

    if (typeof value !== "string") {
      reporter.error(
        `fc:manifest.accountAssociation.${property}`,
        `${property} must be a string`
      );
    } else if (value.length === 0) {
      reporter.error(
        `fc:manifest.accountAssociation.${property}`,
        `${property} must not be empty`
      );
    } else {
      parsedAccountAssociation[property] = value;

      parsedManifest.accountAssociation = parsedAccountAssociation;
    }
  }
}

/**
 * This function mutates the manifest object
 */
function parseManifestDataFrameConfig(
  parsedManifest: PartialFarcasterManifest,
  data: object,
  reporter: Reporter
): void {
  if (!("frame" in data)) {
    reporter.error(
      "fc:manifest",
      'Missing required property "frame" in manifest'
    );

    return;
  }

  if (typeof data.frame !== "object" || data.frame === null) {
    reporter.error("fc:manifest.frame", "Frame config must be an object");

    return;
  }

  const parsedFrame: PartialDeep<FarcasterManifest["frame"]> = {};

  if (!("version" in data.frame)) {
    reporter.error(
      "fc:manifest.frame",
      'Missing required property "version" in frame config'
    );
  } else if (typeof data.frame.version !== "string") {
    reporter.error(
      "fc:manifest.frame.version",
      "Frame version must be a string"
    );
  } else if (data.frame.version.length === 0) {
    reporter.error(
      "fc:manifest.frame.version",
      "Frame version must not be empty"
    );
  } else {
    parsedFrame.version = data.frame.version;
    parsedManifest.frame = parsedFrame;
  }

  if (!("name" in data.frame)) {
    reporter.error(
      "fc:manifest.frame",
      'Missing required property "name" in frame config'
    );
  } else if (typeof data.frame.name !== "string") {
    reporter.error("fc:manifest.frame.name", "Frame name must be a string");
  } else if (data.frame.name.length === 0) {
    reporter.error("fc:manifest.frame.name", "Frame name must not be empty");
  } else {
    parsedFrame.name = data.frame.name;
    parsedManifest.frame = parsedFrame;
  }

  if (!("homeUrl" in data.frame)) {
    reporter.error(
      "fc:manifest.frame",
      'Missing required property "homeUrl" in frame config'
    );
  } else if (typeof data.frame.homeUrl !== "string") {
    reporter.error(
      "fc:manifest.frame.homeUrl",
      "Frame home URL must be a string"
    );
  } else if (!URL.canParse(data.frame.homeUrl)) {
    reporter.error(
      "fc:manifest.frame.homeUrl",
      "Frame home URL must be a valid URL"
    );
  } else {
    parsedFrame.homeUrl = data.frame.homeUrl;
    parsedManifest.frame = parsedFrame;
  }

  if (!("iconUrl" in data.frame)) {
    reporter.error(
      "fc:manifest.frame",
      'Missing required property "iconUrl" in frame config'
    );
  } else if (typeof data.frame.iconUrl !== "string") {
    reporter.error(
      "fc:manifest.frame.iconUrl",
      "Frame icon URL must be a string"
    );
  } else if (!URL.canParse(data.frame.iconUrl)) {
    reporter.error(
      "fc:manifest.frame.iconUrl",
      "Frame icon URL must be a valid URL"
    );
  } else {
    parsedFrame.iconUrl = data.frame.iconUrl;
    parsedManifest.frame = parsedFrame;
  }

  if ("splashImageUrl" in data.frame) {
    if (typeof data.frame.splashImageUrl !== "string") {
      reporter.error(
        "fc:manifest.frame.splashImageUrl",
        "Frame splash image URL must be a string"
      );
    } else if (!URL.canParse(data.frame.splashImageUrl)) {
      reporter.error(
        "fc:manifest.frame.splashImageUrl",
        "Frame splash image URL must be a valid URL"
      );
    } else {
      parsedFrame.splashImageUrl = data.frame.splashImageUrl;
      parsedManifest.frame = parsedFrame;
    }
  }

  if ("splashBackgroundColor" in data.frame) {
    if (typeof data.frame.splashBackgroundColor !== "string") {
      reporter.error(
        "fc:manifest.frame.splashBackgroundColor",
        "Frame splash background color must be a string"
      );
    } else if (
      !/^(?:#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})$/.test(
        data.frame.splashBackgroundColor
      )
    ) {
      reporter.error(
        "fc:manifest.frame.splashBackgroundColor",
        "Frame splash background color must be a valid hex color"
      );
    } else {
      parsedFrame.splashBackgroundColor = data.frame.splashBackgroundColor;
      parsedManifest.frame = parsedFrame;
    }
  }

  if ("webhookUrl" in data.frame) {
    if (typeof data.frame.webhookUrl !== "string") {
      reporter.error(
        "fc:manifest.frame.webhookUrl",
        "Frame webhook URL must be a string"
      );
    } else if (!URL.canParse(data.frame.webhookUrl)) {
      reporter.error(
        "fc:manifest.frame.webhookUrl",
        "Frame webhook URL must be a valid URL"
      );
    } else {
      parsedFrame.webhookUrl = data.frame.webhookUrl;
      parsedManifest.frame = parsedFrame;
    }
  }
}

function parseManifestDataTriggers(
  parsedManifest: PartialFarcasterManifest,
  data: object,
  reporter: Reporter
): void {
  if (!("triggers" in data)) {
    return;
  }

  if (!Array.isArray(data.triggers)) {
    reporter.error("fc:manifest.triggers", "Triggers must be an array");
    return;
  }

  const parsedTriggers: PartialFarcasterManifest["triggers"] = [];

  for (const [index, trgr] of data.triggers.entries()) {
    const trigger: unknown = trgr;
    const reporterKey = `fc:manifest.triggers[${index}]`;

    if (typeof trigger !== "object" || trigger === null) {
      reporter.error(reporterKey, "Trigger must be an object");
      continue;
    }

    const parsedTrigger: PartialDeep<
      NonNullable<PartialFarcasterManifest["triggers"]>[number]
    > = {};

    if ("name" in trigger) {
      if (typeof trigger.name !== "string") {
        reporter.error(`${reporterKey}.name`, "Trigger name must be a string");
      } else if (trigger.name.length === 0) {
        reporter.error(`${reporterKey}.name`, "Trigger name must not be empty");
      } else {
        parsedTrigger.name = trigger.name;
      }
    }

    if (!("type" in trigger)) {
      reporter.error(
        reporterKey,
        'Missing required property "type" in trigger'
      );
    } else if (typeof trigger.type !== "string") {
      reporter.error(`${reporterKey}.type`, "Trigger type must be a string");
    } else if (!["cast", "composer"].includes(trigger.type)) {
      reporter.error(
        `${reporterKey}.type`,
        "Trigger type must be either 'cast' or 'composer'"
      );
    } else {
      parsedTrigger.type = trigger.type as "cast" | "composer";
    }

    if (!("id" in trigger)) {
      reporter.error(reporterKey, 'Missing required property "id" in trigger');
    } else if (typeof trigger.id !== "string") {
      reporter.error(`${reporterKey}.id`, "Trigger id must be a string");
    } else if (trigger.id.length === 0) {
      reporter.error(`${reporterKey}.id`, "Trigger id must not be empty");
    } else {
      parsedTrigger.id = trigger.id;
    }

    if (!("url" in trigger)) {
      reporter.error(reporterKey, 'Missing required property "url" in trigger');
    } else if (typeof trigger.url !== "string") {
      reporter.error(`${reporterKey}.url`, "Trigger url must be a string");
    } else if (!URL.canParse(trigger.url)) {
      reporter.error(`${reporterKey}.url`, "Trigger url must be a valid URL");
    } else {
      parsedTrigger.url = trigger.url;
    }

    parsedTriggers.push(parsedTrigger);
  }

  parsedManifest.triggers = parsedTriggers;
}
