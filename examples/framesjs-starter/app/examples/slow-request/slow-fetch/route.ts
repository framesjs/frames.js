import { getFrameMessage } from "frames.js";
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { RandomNumberRequestStateValue } from "./types";
import { DEFAULT_DEBUGGER_HUB_URL } from "../../../debug";

const MAXIMUM_KV_RESULT_LIFETIME_IN_SECONDS = 2 * 60; // 2 minutes

export async function POST(req: NextRequest) {
  const body = await req.json();

  // verify independently
  const frameMessage = await getFrameMessage(body.postBody, {
    hubHttpUrl: DEFAULT_DEBUGGER_HUB_URL,
  });

  const uniqueId = `fid:${frameMessage.requesterFid}`;

  // Wait 10 seconds
  await new Promise((resolve) => setTimeout(resolve, 10000));

  try {
    const randomNumber = Math.random();

    await kv.set<RandomNumberRequestStateValue>(
      uniqueId,
      {
        data: randomNumber,
        status: "success",
        timestamp: new Date().getTime(),
      },
      { ex: MAXIMUM_KV_RESULT_LIFETIME_IN_SECONDS }
    );

    return NextResponse.json({
      data: randomNumber,
      status: "success",
      timestamp: new Date().getTime(),
    });
  } catch (e) {
    await kv.set<RandomNumberRequestStateValue>(
      uniqueId,
      {
        error: String(e),
        status: "error",
        timestamp: new Date().getTime(),
      },
      { ex: MAXIMUM_KV_RESULT_LIFETIME_IN_SECONDS }
    );
    // Handle errors
    return NextResponse.json({ message: e }, { status: 500 });
  }
}
