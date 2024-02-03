import { getFrame } from "frames.js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
  const body = await req.json();

  try {
    const url = body.untrustedData.url;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const htmlString = await r.text();

    const frame = getFrame({ htmlString, url });

    if (!frame) {
      return new Response("Invalid frame", { status: 400 });
    }

    return Response.json(frame);
  } catch (err) {
    console.error(err);
    return Response.error();
  }
}
