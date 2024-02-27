import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getFrameMessage } from "frames.js";
import { Dalle, type DalleSuccessResult } from "./dall-e";
import { DEBUG_HUB_OPTIONS } from "../../../debug/constants";
// extend this endpoint to 5 min timeout
export const maxDuration = 300;

const MAXIMUM_KV_RESULT_LIFETIME_IN_SECONDS = 60 * 60; // 1 hour

export type PromptToImageRequestStateValue =
  | {
      error: string;
      status: "error";
      timestamp: number;
    }
  | {
      data: DalleSuccessResult["data"];
      status: "success";
      timestamp: number;
    }
  | {
      status: "pending";
      timestamp: number;
    };

export async function POST(req: NextRequest) {
  const body = await req.json();

  // verify independently
  const frameMessage = await getFrameMessage(body.postBody, {
    ...DEBUG_HUB_OPTIONS,
  });

  const uniqueId = `fid:${frameMessage.requesterFid}`;
  const prompt = frameMessage.inputText;
  console.log("!!!!", frameMessage, body);
  if (!prompt) {
    // set error, return
    await kv.set<PromptToImageRequestStateValue>(
      uniqueId,
      {
        error: "no prompt",
        status: "error",
        timestamp: new Date().getTime(),
      },
      { ex: MAXIMUM_KV_RESULT_LIFETIME_IN_SECONDS }
    );

    return NextResponse.json({ message: "no prompt set" }, { status: 400 });
  }

  try {
    const dalleResult = await Dalle(prompt, frameMessage.requesterFid);

    if ("error" in dalleResult) {
      await kv.set<PromptToImageRequestStateValue>(
        uniqueId,
        {
          error: dalleResult.error,
          status: "error",
          timestamp: new Date().getTime(),
        },
        { ex: MAXIMUM_KV_RESULT_LIFETIME_IN_SECONDS }
      );

      return NextResponse.json({ message: dalleResult.error }, { status: 500 });
    }

    await kv.set<PromptToImageRequestStateValue>(
      uniqueId,
      {
        data: dalleResult.data,
        status: "success",
        timestamp: new Date().getTime(),
      },
      { ex: MAXIMUM_KV_RESULT_LIFETIME_IN_SECONDS }
    );

    return NextResponse.json({
      data: dalleResult.data,
      status: "success",
      timestamp: new Date().getTime(),
    });
  } catch (e) {
    await kv.set<PromptToImageRequestStateValue>(
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
