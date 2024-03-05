"use server";

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { sortedSearchParamsString } from "../lib/utils";
import { type FrameActionHubContext } from "frames.js";

export type MockHubActionContext = FrameActionHubContext & {
  enabled: boolean;
};

const MOCK_FILE_NAME = "framesjsmocks.json";

type MockFileData = {
  enabled: boolean;
  requests: { [pathname: string]: { ok: boolean } };
};

function resolveMocksFilePath() {
  return path.join(os.tmpdir(), MOCK_FILE_NAME);
}

/**
 * Checks if a mock response is available for the given request and hub path.
 */
export async function loadMockResponseForDebugHubRequest(
  req: Request,
  hubPath: string[]
): Promise<Response | undefined> {
  // Only available in local development
  const file = resolveMocksFilePath();
  const fileExists = await fs
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);

  if (!fileExists) {
    return;
  }

  const json = await fs.readFile(file, "utf-8");

  let mocks: MockFileData;
  try {
    mocks = JSON.parse(json);
  } catch (err) {
    console.error(err);
    return;
  }

  if (!mocks.enabled) {
    return;
  }

  const searchParams = new URL(req.url).searchParams;
  const pathAndQuery = `/${hubPath.join("/")}?${sortedSearchParamsString(searchParams)}`;
  const mockResult = mocks.requests[pathAndQuery];

  if (mockResult?.ok != null) {
    console.log(
      `info: Mock hub: Found mock for ${pathAndQuery}, returning ${mockResult.ok ? "200" : "404"}`
    );
    return new Response(JSON.stringify(mockResult), {
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
    mockData: MockHubActionContext;
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
  const file = resolveMocksFilePath();

  const json: MockFileData = {
    enabled: mockData.enabled,
    requests: {
      [requesterFollowsCaster]: {
        ok: mockData.enabled && mockData.requesterFollowsCaster,
      },
      [casterFollowsRequester]: {
        ok: mockData.enabled && mockData.casterFollowsRequester,
      },
      [likedCast]: {
        ok: mockData.enabled && mockData.likedCast,
      },
      [recastedCast]: {
        ok: mockData.enabled && mockData.recastedCast,
      },
    },
  };

  await fs.writeFile(file, JSON.stringify(json, null, 2));
}
