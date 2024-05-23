/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { frames } from "../frames";

export const runtime = "nodejs";

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

const handleRequest = frames(async (ctx) => {
  const [interRegularFontData, interBoldFontData, firaScriptData] =
    await Promise.all([interRegularFont, interBoldFont, firaScriptFont]);

  return {
    buttons: [
      <Button target={"/edge"} action="post">
        Edge Fn
      </Button>,
    ],
    image: (
      <span tw="flex flex-col">
        <div>Node.js example custom fonts</div>
        <div style={{ marginTop: 40, fontWeight: 400 }}>Regular Inter Font</div>
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
});

export const POST = handleRequest;
