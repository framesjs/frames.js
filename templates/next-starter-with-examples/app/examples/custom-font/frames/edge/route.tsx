/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "../frames";
import { imagesWorkerMiddleware } from "frames.js/middleware/images-worker";

// without this line, this type of importing fonts doesn't work for some reason
export const runtime = "edge";

const interRegularFont = fetch(
  new URL("/public/Inter-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer());
const interBoldFont = fetch(
  new URL("/public/Inter-Bold.ttf", import.meta.url)
).then((res) => res.arrayBuffer());
const firaScriptFont = fetch(
  new URL("/public/FiraCodeiScript-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

const handleRequest = frames(
  async (ctx) => {
    return {
      image: (
        <span tw="flex flex-col">
          <div>Edge functions</div>
          <div>Per-route fonts</div>
          <div style={{ marginTop: 40, fontWeight: 400 }}>
            Regular Inter Font
          </div>
          <div style={{ marginTop: 40, fontWeight: 700 }}>Bold Inter Font</div>
          <div
            style={{
              fontFamily: "'Fira Code', monospace",
              marginTop: 40,
            }}
          >
            Fira
          </div>
        </span>
      ),
      buttons: [
        <Button action="post" target={"/nodejs"}>
          Node.js
        </Button>,
      ],
    };
  },
  {
    middleware: [
      imagesWorkerMiddleware({
        imagesRoute: "/edge",
        secret: "SOME_SECRET",
        // This can be set up in the `createFrames` function to be shared across all routes
        imageRenderingOptions: async () => {
          const [interRegularFontData, interBoldFontData, firaScriptFontData] =
            await Promise.all([
              interRegularFont,
              interBoldFont,
              firaScriptFont,
            ]);
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
      }),
    ],
  }
);

export const POST = handleRequest;
export const GET = handleRequest;
