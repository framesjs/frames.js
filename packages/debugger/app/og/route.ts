import { getFrame } from "frames.js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
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
