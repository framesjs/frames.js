import { NextRequest } from "next/server";
import { ImageResponse } from "@vercel/og";

export async function GET(req: NextRequest) {
  const imageResponse = new ImageResponse(
    (
      <div tw="bg-purple-800 text-white w-full h-full justify-center items-center flex text-[48px]">
        The current time is {new Date().toLocaleString()}
      </div>
    ),
    { width: 1146, height: 600 }
  );

  // Set the cache control headers to ensure the image is not cached
  imageResponse.headers.set("Cache-Control", "public, max-age=0");

  return imageResponse;
}
