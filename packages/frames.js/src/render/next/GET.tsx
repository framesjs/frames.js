import { getFrame } from "../..";
import { NextRequest, NextResponse as NextResponseBase } from "next/server";

// this is ugly hack to go around the issue https://github.com/vercel/next.js/pull/61721
const NextResponse = (
  "default" in NextResponseBase ? NextResponseBase.default : NextResponseBase
) as typeof NextResponseBase;

/** Proxies fetching a frame through a backend to avoid CORS issues and preserve user IP privacy */
export async function GET(request: NextRequest): Promise<NextResponseBase> {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ message: "Invalid URL" }, { status: 400 });
  }
  try {
    const urlRes = await fetch(url);
    const htmlString = await urlRes.text();

    const { frame, errors } = getFrame({ htmlString, url });

    return NextResponse.json({ frame, errors });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: err }, { status: 500 });
  }
}
