import { GET, POST as OriginalPostHandler } from "@frames.js/render/next";
import { type NextRequest } from "next/server";
import { persistMockResponsesForDebugHubRequests } from "../utils/mock-hub-utils";

export { GET };

export async function POST(req: NextRequest) {
  const specification = req.nextUrl.searchParams.get("specification") ?? "farcaster";
  if (specification === "farcaster") {
    await persistMockResponsesForDebugHubRequests(req);
  }

  return OriginalPostHandler(req);
}
