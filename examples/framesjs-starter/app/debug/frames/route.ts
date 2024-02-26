import { GET, POST as OriginalPostHandler } from "frames.js/render/next";
import { type NextRequest } from "next/server";
import { persistMockResponsesForDebugHubRequests } from "../utils/mock-hub-utils";

export { GET };

export async function POST(req: NextRequest) {
  await persistMockResponsesForDebugHubRequests(req);

  return OriginalPostHandler(req);
}
