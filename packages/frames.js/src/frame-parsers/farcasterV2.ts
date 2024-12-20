import type { CheerioAPI } from "cheerio";
import {
  frameEmbedNextSchema,
  domainManifestSchema,
} from "@farcaster/frame-core";
import { z } from "zod";
import type { FarcasterManifest } from "../farcaster-v2/types";
import { decodePayload, verify } from "../farcaster-v2/json-signature";
import { getMetaTag, removeInvalidDataFromObject } from "./utils";
import type {
  ParseResultFramesV2,
  ParseResultFramesV2FrameManifest,
  Reporter,
} from "./types";
import { createReporter } from "./reporter";

// @todo find out how to report that url is not secure but still keep it valid
// maybe do this by using our own issue code which we will filter out before parsing partial data
// this will make sure that manifest/frame status is failure but data is there

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- hard to type and we can infer because this is internal function, not exported
function createDomainManifestParser(strict: boolean, reporter: Reporter) {
  if (!strict) {
    const nonStrictDomainManifestSchema = domainManifestSchema.extend({
      frame: domainManifestSchema.shape.frame
        .unwrap()
        .extend({
          iconUrl: z
            .string()
            .url()
            .transform((val) => {
              if (!val.startsWith("https://")) {
                reporter.error(
                  "fc:manifest.frame.iconUrl",
                  "Must be an https url"
                );
              }

              return val;
            }),
          homeUrl: z
            .string()
            .url()
            .transform((val) => {
              if (!val.startsWith("https://")) {
                reporter.error(
                  "fc:manifest.frame.homeUrl",
                  "Must be an https url"
                );
              }

              return val;
            }),
          imageUrl: z
            .string()
            .url()
            .transform((val) => {
              if (!val.startsWith("https://")) {
                reporter.error(
                  "fc:manigest.frame.imageUrl",
                  "Must be an https url"
                );
              }

              return val;
            })
            .optional(),
          splashImageUrl: z
            .string()
            .url()
            .transform((val) => {
              if (!val.startsWith("https://")) {
                reporter.error(
                  "fc:manifest.frame.splashImageUrl",
                  "Must be an https url"
                );
              }

              return val;
            })
            .optional(),
          webhookUrl: z
            .string()
            .url()
            .transform((val) => {
              if (!val.startsWith("https://")) {
                reporter.error(
                  "fc:manifest.frame.webhookUrl",
                  "Must be an https url"
                );
              }

              return val;
            })
            .optional(),
        })
        .optional(),
    });

    return nonStrictDomainManifestSchema;
  }

  return domainManifestSchema;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- hard to type and we can infer because this is internal function, not exported
function createFrameEmbedParser(strict: boolean, reporter: Reporter) {
  if (!strict) {
    const nonStrictFrameEmbedNextSchema = frameEmbedNextSchema.extend({
      imageUrl: z
        .string()
        .url()
        .transform((val) => {
          if (!val.startsWith("https://")) {
            reporter.error("fc:frame.imageUrl", "Must be an https url");
          }

          return val;
        }),
      button: frameEmbedNextSchema.shape.button.extend({
        action: z.discriminatedUnion("type", [
          frameEmbedNextSchema.shape.button.shape.action.options[0].extend({
            url: z
              .string()
              .url()
              .transform((val) => {
                if (!val.startsWith("https://")) {
                  reporter.error(
                    "fc:frame.button.action.url",
                    "Must be an https url"
                  );
                }

                return val;
              }),
            splashImageUrl: z
              .string()
              .url()
              .transform((val) => {
                if (!val.startsWith("https://")) {
                  reporter.error(
                    "fc:frame.button.action.splashImageUrl",
                    "Must be an https url"
                  );
                }

                return val;
              })
              .optional(),
          }),
        ]),
      }),
    });

    return nonStrictFrameEmbedNextSchema;
  }

  return frameEmbedNextSchema;
}

export type ParseFarcasterFrameV2ValidationSettings = {
  /**
   * Enable/disable frame manifest parsing.
   *
   * @see https://docs.farcaster.xyz/developers/frames/v2/spec#frame-manifest
   *
   * @defaultValue false
   */
  parseManifest?: boolean;
  /**
   * Allows you to disable strict mode
   *
   * Strict mode check if all urls are secure (https://) and if they are valid urls
   *
   * @defaultValue true
   */
  strict?: boolean;
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
    strict = true,
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

  const parser = createFrameEmbedParser(strict, reporter);
  const frameEmbedParseResult = parser.safeParse(parsedJSON);

  if (!frameEmbedParseResult.success) {
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
    status: reporter.hasErrors() ? "failure" : "success",
    frame: frameEmbedParseResult.data,
    reports: reporter.toObject(),
    specification: "farcaster_v2",
    manifest: parseManifestEnabled
      ? await parseManifest(frameUrl, strict)
      : undefined,
  };
}

async function parseManifest(
  frameUrl: string,
  strict: boolean
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
    const parser = createDomainManifestParser(strict, reporter);
    const manifestParseResult = parser.safeParse(body);

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
      "fc:manifest.accountAssociation",
      "Failed to verify account association signature"
    );
    return;
  }

  const parsedPayload = decodePayload(manifest.accountAssociation.payload);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- it could be anything
  if (typeof parsedPayload !== "object" || parsedPayload === null) {
    reporter.error(
      "fc:manifest.accountAssociation.payload",
      "Failed to parse account association payload"
    );
    return;
  }

  if (!("domain" in parsedPayload)) {
    reporter.error(
      "fc:manifest.accountAssociation.payload",
      "Missing required property 'domain' in account association payload"
    );
  } else if (typeof parsedPayload.domain !== "string") {
    reporter.error(
      "fc:manifest.accountAssociation.payload",
      "Account association payload domain must be a string"
    );
  } else if (parsedPayload.domain !== domain) {
    reporter.error(
      "fc:manifest.accountAssociation.payload",
      "Account association payload domain must match the frame URL"
    );
  }
}
