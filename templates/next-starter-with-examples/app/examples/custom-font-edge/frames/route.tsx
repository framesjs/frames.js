/* eslint-disable react/jsx-key */
import { frames } from "./frames";

// Add this line to the route that will be handling images
export const runtime = "edge";

const handler = frames(async (ctx) => {
  return {
    image: (
      <span tw="flex flex-col">
        <div>Edge functions</div>
        <div>Per-route fonts</div>
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
