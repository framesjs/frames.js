/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { frames } from "../frames";
import { imagesWorkerMiddleware } from "frames.js/middleware/images-worker";

export const runtime = "nodejs";

const handleRequest = frames(
  async (ctx) => {
    return {
      buttons: [
        <Button target={"/edge"} action="post">
          Edge Fn
        </Button>,
      ],
      image: (
        <span tw="flex flex-col">
          <div>Node.js Example</div>
          <div>Per-route custom fonts</div>
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
    };
  },
  {
    middleware: [
      imagesWorkerMiddleware({
        imagesRoute: "/nodejs",
        secret: "SOME_SECRET",
        // This can be set up in the `createFrames` function to be shared across all routes
        imageRenderingOptions: async () => {
          const interRegularFont = fs.readFile(
            path.join(
              path.resolve(process.cwd(), "public"),
              "Inter-Regular.ttf"
            )
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
                  data: firaScriptData,
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
