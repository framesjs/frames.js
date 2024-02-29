"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { sortedSearchParamsString } from "../lib/utils";
import { type FrameActionHubContext } from "frames.js";

const MOCK_FILE_NAME = "mocks.json";

type MockFileData = { [pathname: string]: { ok: boolean } };

/**
 * Checks if a mock response is available for the given request and hub path.
 */
export async function loadMockResponseForDebugHubRequest(
  req: Request,
  hubPath: string[]
): Promise<Response | undefined> {
  // Only available in local development
  const file = path.join(process.cwd(), MOCK_FILE_NAME);
  const fileExists = await fs
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);

  if (!fileExists) {
    return;
  }

  const json = await fs.readFile(file, "utf-8");
  const mocks: MockFileData = JSON.parse(json);
  const searchParams = new URL(req.url).searchParams;
  const pathAndQuery = `/${hubPath.join("/")}?${sortedSearchParamsString(searchParams)}`;
  const mockResult = mocks[pathAndQuery];

  if (mockResult?.ok != null) {
    console.log(
      `info: Mock hub: Found mock for ${pathAndQuery}, returning ${mockResult.ok ? "200" : "404"}`
    );

    return new Response(JSON.stringify(mocks[pathAndQuery]), {
      headers: {
        "content-type": "application/json",
      },
      status: mockResult.ok ? 200 : 404,
    });
  }
}

export async function persistMockResponsesForDebugHubRequests(req: Request) {
  const {
    mockData,
    untrustedData: { fid: requesterFid, castId },
  } = (await req.clone().json()) as {
    mockData: FrameActionHubContext;
    untrustedData: { fid: string; castId: { fid: string; hash: string } };
  };

  const requesterFollowsCaster = `/v1/linkById?${sortedSearchParamsString(
    new URLSearchParams({
      fid: requesterFid,
      target_fid: castId.fid,
      link_type: "follow",
    })
  )}`;
  const casterFollowsRequester = `/v1/linkById?${sortedSearchParamsString(
    new URLSearchParams({
      fid: castId.fid,
      target_fid: requesterFid,
      link_type: "follow",
    })
  )}`;
  const likedCast = `/v1/reactionById?${sortedSearchParamsString(
    new URLSearchParams({
      fid: requesterFid,
      reaction_type: "1",
      target_fid: castId.fid,
      target_hash: castId.hash,
    })
  )}`;
  const recastedCast = `/v1/reactionById?${sortedSearchParamsString(
    new URLSearchParams({
      fid: requesterFid,
      reaction_type: "2",
      target_fid: castId.fid,
      target_hash: castId.hash,
    })
  )}`;

  // Write to file
  const file = path.join(process.cwd(), MOCK_FILE_NAME);

  const json: MockFileData = {
    [requesterFollowsCaster]: {
      ok: mockData.requesterFollowsCaster,
    },
    [casterFollowsRequester]: {
      ok: mockData.casterFollowsRequester,
    },
    [likedCast]: {
      ok: mockData.likedCast,
    },
    [recastedCast]: {
      ok: mockData.recastedCast,
    },
  };
  await fs.writeFile(file, JSON.stringify(json, null, 2));
}
