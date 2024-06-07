import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export const frames = createFrames({
  basePath: "/examples/custom-font-nodejs/frames",
  baseUrl: appURL(),
  debug: process.env.NODE_ENV === "development",
  imageRenderingOptions: async () => {
    const interRegularFont = fs.readFile(
      path.join(path.resolve(process.cwd(), "public"), "Inter-Regular.ttf")
    );

    const interBoldFont = fs.readFile(
      path.join(path.resolve(process.cwd(), "public"), "Inter-Bold.ttf")
    );

    const firaScriptFont = fs.readFile(
      path.join(
        path.resolve(process.cwd(), "public"),
        "FiraCodeiScript-Regular.ttf"
      )
    );
    const [interRegularFontData, interBoldFontData, firaScriptData] =
      await Promise.all([interRegularFont, interBoldFont, firaScriptFont]);
    return {
      imageOptions: {
        fonts: [
          {
            name: "Inter",
            data: interRegularFontData,
            weight: 400,
          },
          {
            name: "Inter",
            data: interBoldFontData,
            weight: 700,
          },
          {
            name: "Fira Code",
            data: firaScriptData,
            weight: 700,
          },
        ],
      },
    };
  },
});
