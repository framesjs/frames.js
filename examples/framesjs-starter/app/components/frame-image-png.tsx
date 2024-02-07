import { FrameImage } from "frames.js/next/server";
import * as fs from "fs";
import { join } from "path";
import satori from "satori";
import sharp from "sharp";

const interRegPath = join(process.cwd(), "public/Inter-Regular.ttf");
let interReg = fs.readFileSync(interRegPath);

// Error: Child component must be a valid Frames.js component
export async function FrameImagePng(props: { children: React.ReactNode }) {
  const imageSvg = await satori(
    <div
      style={{
        display: "flex", // Use flex layout
        flexDirection: "row", // Align items horizontally
        alignItems: "stretch", // Stretch items to fill the container height
        width: "100%",
        height: "100vh", // Full viewport height
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 24,
          paddingRight: 24,
          lineHeight: 1.2,
          fontSize: 36,
          color: "black",
          flex: 1,
          overflow: "hidden",
          marginTop: 24,
        }}
      >
        {props.children}
      </div>
    </div>,
    {
      width: 1146,
      height: 600,
      fonts: [
        {
          name: "Inter",
          data: interReg,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );

  const imagePng = await sharp(Buffer.from(imageSvg))
    .toFormat("png")
    .toBuffer();

  const imagePngB64 = imagePng.toString("base64");

  return <FrameImage src={`data:image/png;base64,${imagePngB64}`} />;
}
