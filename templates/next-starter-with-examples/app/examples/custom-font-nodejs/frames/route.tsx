/* eslint-disable react/jsx-key */
import { frames } from "./frames";

export const runtime = "nodejs";

const handler = frames(async (ctx) => {
  return {
    image: (
      <span tw="flex flex-col">
        <div>Node.js Example</div>
        <div>Per-route custom fonts</div>
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
  };
});

export const GET = handler;
export const POST = handler;
