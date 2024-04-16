import { getFrame } from "frames.js";
import type { NextRequest } from "next/server";
import { isSpecificationValid } from "./validators";


/** Proxies fetching a frame through a backend to avoid CORS issues and preserve user IP privacy */
export async function GET(request: NextRequest): Promise<Response> {
  const url = request.nextUrl.searchParams.get("url");
  const specification = request.nextUrl.searchParams.get('specification') ?? 'farcaster';

  if (!url) {
    return Response.json({ message: "Invalid URL" }, { status: 400 });
  }

  if (!isSpecificationValid(specification)) {
    return Response.json({ message: "Invalid specification" }, { status: 400 });
  }

  try {
    const urlRes = await fetch(url);
    const htmlString = await urlRes.text();

    const result = getFrame({ htmlString, url, specification });

    return Response.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.error(err);
    return Response.json({ message: err }, { status: 500 });
  }
}
