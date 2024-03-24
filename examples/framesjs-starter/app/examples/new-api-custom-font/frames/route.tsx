/* eslint-disable react/jsx-key */
import { frames } from "./frames";

// without this line, this type of importing fonts doesn't work for some reason
export const runtime = "edge";

const regularFont = fetch(
  new URL("/public/Inter-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

const boldFont = fetch(new URL("/public/Inter-Bold.ttf", import.meta.url)).then(
  (res) => res.arrayBuffer()
);

const handleRequest = frames(async (ctx) => {
  const [regularFontData, boldFontData] = await Promise.all([
    regularFont,
    boldFont,
  ]);

  return {
    image: (
      <span>
        <div style={{ marginTop: 40, fontWeight: 400 }}>Regular Inter Font</div>
        <div style={{ marginTop: 40, fontWeight: 700 }}>Bold Inter Font</div>
      </span>
    ),
    textInput: "Type something!",
    imageOptions: {
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
    },
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
