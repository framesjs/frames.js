import type { CheerioAPI } from "cheerio";
import {
  frameEmbedNextSchema,
  domainManifestSchema,
} from "@farcaster/frame-core";
import type { FarcasterManifest } from "../farcaster-v2/types";
import { decodePayload, verify } from "../farcaster-v2/json-signature";
import { getMetaTag, removeInvalidDataFromObject } from "./utils";
import type {
  ParseResultFramesV2,
  ParseResultFramesV2FrameManifest,
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

  const frameEmbedParseResult = frameEmbedNextSchema.safeParse(parsedJSON);

  if (!frameEmbedParseResult.success) {
    // console.log(frameEmbedParseResult.error.issues);
    // const flattened = frameEmbedParseResult.error.flatten();
    // console.log(flattened);

    for (const error of frameEmbedParseResult.error.errors) {
      if (error.path.length > 0) {
        reporter.error(`fc:frame.${error.path.join(".")}`, error.message);
      } else {
        reporter.error("fc:frame", error.message);
      }
    }

    return {
      status: "failure",
      frame: removeInvalidDataFromObject<typeof frameEmbedNextSchema>(
        parsedJSON,
        frameEmbedParseResult.error
      ),
      reports: reporter.toObject(),
      specification: "farcaster_v2",
    };
  }

  return {
    status: "success",
    frame: frameEmbedParseResult.data,
    reports: reporter.toObject(),
    specification: "farcaster_v2",
    manifest: parseManifestEnabled ? await parseManifest(frameUrl) : undefined,
  };
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
    const manifestParseResult = domainManifestSchema.safeParse(body);

    if (!manifestParseResult.success) {
      for (const error of manifestParseResult.error.errors) {
        if (error.path.length > 0) {
          reporter.error(`fc:manifest.${error.path.join(".")}`, error.message);
        } else {
          reporter.error("fc:manifest", error.message);
        }
      }

      return {
        status: "failure",
        manifest: removeInvalidDataFromObject<typeof domainManifestSchema>(
          body,
          manifestParseResult.error
        ),
        reports: reporter.toObject(),
      };
    }

    await verifyManifestAccountAssociation(
      manifestParseResult.data,
      frameUrl,
      reporter
    );

    if (reporter.hasErrors()) {
      return {
        status: "failure",
        manifest: manifestParseResult.data,
        reports: reporter.toObject(),
      };
    }

    return {
      status: "success",
      manifest: manifestParseResult.data,
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

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- it could be anything
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
