import { FrameActionHubContext, getFrame } from "frames.js";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { sortedSearchParamsString } from "../lib/utils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const isPostRedirect =
    req.nextUrl.searchParams.get("postType") === "post_redirect";
  const postUrl = req.nextUrl.searchParams.get("postUrl")!;

  const { mockData, ...rest } = body;
  try {
    persistMockRequest(body);
  } catch (error) {}

  try {
    const r = await fetch(postUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      redirect: isPostRedirect ? "manual" : undefined,
      body: JSON.stringify(rest),
    });

    if (r.status === 302) {
      return Response.json(
        {
          location: r.headers.get("location"),
        },
        { status: 302 }
      );
    }

    const htmlString = await r.text();

    const { frame, errors } = getFrame({
      htmlString,
      url: body.untrustedData.url,
    });

    return Response.json({ frame, errors });
  } catch (err) {
    console.error(err);
    return Response.error();
  }
}

function persistMockRequest({
  mockData,
  untrustedData: { fid: requesterFid, castId },
}: {
  mockData: FrameActionHubContext;
  untrustedData: { fid: string; castId: { fid: string; hash: string } };
}) {
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
  const file = path.join(process.cwd(), "app", "debug", "mocks.json");
  const json = {
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
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
}
