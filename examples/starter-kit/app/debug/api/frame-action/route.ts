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
      redirect: "manual", // Only if post_redirect
      body: JSON.stringify(body),
    });

    // Only if post_redirect
    if (r.status === 302) {
      return Response.json(
        {
          location: r.headers.get("location"),
        },
        { status: 302 }
      );
    }

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
