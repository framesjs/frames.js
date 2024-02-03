import { getFrame } from "frames.js";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Invalid URL", { status: 400 });
  }

  const urlRes = await fetch(url);
  const htmlString = await urlRes.text();

  const frame = getFrame({ htmlString, url });

  if (!frame) {
    return new Response("Invalid frame", { status: 400 });
  }

  return Response.json(frame);
}
