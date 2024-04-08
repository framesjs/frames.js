import { ImageResponse } from "@vercel/og";
import { createImagesWorker } from "frames.js/middleware/images-worker/next";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export const runtime = "nodejs";

const imagesRoute = createImagesWorker();

export const GET = imagesRoute(async (jsx) => {
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
});

function Scaffold({ children }: { children: React.ReactNode }) {
  return (
    <div tw="flex items-stretch relative w-full h-screen bg-white overflow-hidden">
      <div tw="flex flex-col justify-center items-center text-black w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
