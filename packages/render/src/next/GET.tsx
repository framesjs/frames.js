import { getFrame } from "frames.js";
import type { NextRequest } from "next/server";
import { NextResponse as NextResponseBase } from "next/server";

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

    const result = getFrame({ htmlString, url });

    return NextResponse.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.error(err);
    return NextResponse.json({ message: err }, { status: 500 });
  }
}
