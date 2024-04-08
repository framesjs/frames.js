import { NextRequest } from "next/server";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ImageResponse } from "@vercel/og";
import { deserializeJsx } from "frames.js/middleware/images-worker";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const regularFont = fs.readFile(
    path.join(path.resolve(process.cwd(), "public"), "Inter-Regular.ttf")
  );

  const boldFont = fs.readFile(
    path.join(path.resolve(process.cwd(), "public"), "Inter-Bold.ttf")
  );

  const [regularFontData, boldFontData] = await Promise.all([
    regularFont,
    boldFont,
  ]);

  const serialized = req.nextUrl.searchParams.get("jsx");

  if (!serialized) {
    throw new Error("No jsx");
  }

  const json = JSON.parse(serialized);

  console.log(json);

  const jsx = deserializeJsx(json);

  const width = 1000;
  const height = Math.round(width * 1.91);

  return new ImageResponse(<Scaffold>{jsx}</Scaffold>, {
    width,
    height,
    fonts: [
      {
        name: "Inter",
        data: regularFontData,
        weight: 400,
      },
      {
        name: "Inter",
        data: boldFontData,
        weight: 700,
      },
    ],
  });
}

function Scaffold({ children }: { children: React.ReactNode }) {
  return (
    <div tw="flex flex-row items-stretch relative w-full h-screen bg-white overflow-hidden">
      <div tw="flex flex-col justify-center items-center text-black overflow-hidden">
        {children}
      </div>
    </div>
  );
}
