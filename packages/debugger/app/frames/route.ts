import { POST as OriginalPostHandler } from "@frames.js/render/next";
import { getFrame } from "frames.js";
import { type NextRequest } from "next/server";
import { persistMockResponsesForDebugHubRequests } from "../utils/mock-hub-utils";
import { getAction } from "../actions/getAction";

/** Proxies fetching a frame through a backend to avoid CORS issues and preserve user IP privacy */
export async function GET(request: NextRequest): Promise<Response> {
  const url = request.nextUrl.searchParams.get("url");
  const specification =
    request.nextUrl.searchParams.get("specification") ?? "farcaster";

  if (!url) {
    return Response.json({ message: "Invalid URL" }, { status: 400 });
  }

  if (!(specification === "farcaster" || specification === "openframes")) {
    return Response.json({ message: "Invalid specification" }, { status: 400 });
  }

  try {
    const urlRes = await fetch(url);

    // If content type is JSON it could be an action
    if (
      urlRes.headers.get("content-type")?.includes("application/json") &&
      specification === "farcaster"
    ) {
      const json = (await urlRes.json()) as object;

      const result = getAction({ json, specification });

      return Response.json({ ...result, type: "action", url });
    }

    const htmlString = await urlRes.text();

    const result = getFrame({ htmlString, url, specification });

    return Response.json({ ...result, type: "frame" });
  } catch (err) {
    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.error(err);
    return Response.json({ message: err }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const specification =
    req.nextUrl.searchParams.get("specification") ?? "farcaster";
  if (specification === "farcaster") {
    await persistMockResponsesForDebugHubRequests(req);
  }

  return OriginalPostHandler(req);
}
