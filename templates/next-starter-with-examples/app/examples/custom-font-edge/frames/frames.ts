import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/custom-font-edge/frames",
  baseUrl: appURL(),
  debug: process.env.NODE_ENV === "development",
  imageRenderingOptions: async () => {
    const interRegularFont = fetch(
      new URL("/public/Inter-Regular.ttf", import.meta.url)
    ).then((res) => res.arrayBuffer());
    const interBoldFont = fetch(
      new URL("/public/Inter-Bold.ttf", import.meta.url)
    ).then((res) => res.arrayBuffer());
    const firaScriptFont = fetch(
      new URL("/public/FiraCodeiScript-Regular.ttf", import.meta.url)
    ).then((res) => res.arrayBuffer());

    const [interRegularFontData, interBoldFontData, firaScriptFontData] =
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
            data: firaScriptFontData,
            weight: 700,
          },
        ],
      },
    };
  },
});
