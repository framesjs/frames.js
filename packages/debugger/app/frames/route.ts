import { POST as handlePOSTRequest } from "@frames.js/render/next";
import { type NextRequest } from "next/server";
import { getAction } from "../actions/getAction";
import { persistMockResponsesForDebugHubRequests } from "../utils/mock-hub-utils";
import type { SupportedParsingSpecification } from "frames.js";
import { parseFramesWithReports } from "frames.js/parseFramesWithReports";
import type { ParseActionResult } from "../actions/types";
import type { ParseFramesWithReportsResult } from "frames.js/frame-parsers";

export type CastActionDefinitionResponse = ParseActionResult & {
  type: "action";
  url: string;
};

export type FrameDefinitionResponse = ParseFramesWithReportsResult & {
  type: "frame";
};

export function isSpecificationValid(
  specification: unknown
): specification is SupportedParsingSpecification {
  return (
    typeof specification === "string" &&
    ["farcaster", "farcaster_v2", "openframes"].includes(specification)
  );
}

/** Proxies fetching a frame through a backend to avoid CORS issues and preserve user IP privacy */
export async function GET(request: NextRequest): Promise<Response> {
  const url = request.nextUrl.searchParams.get("url");
  const specification =
    request.nextUrl.searchParams.get("specification") ?? "farcaster";
  const shouldParseActions = request.nextUrl.searchParams.get("actions");

  if (!url) {
    return Response.json({ message: "Invalid URL" }, { status: 400 });
  }

  if (!isSpecificationValid(specification)) {
    return Response.json({ message: "Invalid specification" }, { status: 400 });
  }

  try {
    const urlRes = await fetch(url);

    // If content type is JSON it could be an action
    if (
      urlRes.headers.get("content-type")?.includes("application/json") &&
      specification === "farcaster" &&
      shouldParseActions
    ) {
      const json = (await urlRes.json()) as object;

      const result = getAction({ json, specification });

      return Response.json({
        ...result,
        type: "action",
        url,
      } satisfies CastActionDefinitionResponse);
    }

    const html = await urlRes.text();

    const parseResult = await parseFramesWithReports({
      html,
      frameUrl: url,
      fallbackPostUrl: url,
      fromRequestMethod: "GET",
      parseSettings: {
        farcaster_v2: {
          parseManifest: true,
          strict: false,
        },
      },
    });

    return Response.json({
      ...parseResult,
      type: "frame",
    } satisfies FrameDefinitionResponse);
  } catch (err) {
    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.error(err);

    if (err instanceof Error) {
      return Response.json({ message: err.message }, { status: 500 });
    }

    return Response.json({ message: err }, { status: 500 });
  }
}

/** Proxies frame actions to avoid CORS issues and preserve user IP privacy */
export async function POST(req: NextRequest): Promise<Response> {
  await persistMockResponsesForDebugHubRequests(req);

  return handlePOSTRequest(req);
}
