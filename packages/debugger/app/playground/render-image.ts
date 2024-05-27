import { Resvg, initWasm } from "@resvg/resvg-wasm";
import type { ImageAspectRatio } from "frames.js";
import satori, { init } from "satori";
import initYoga from "yoga-wasm-web";

let yogaInitialized = false;
let resvgInitialized = false;

async function initializeResvg() {
  if (resvgInitialized) {
    return;
  }

  await initWasm(
    await fetch("/resvg.wasm").then((res) => res.arrayBuffer())
  ).catch((e) => {
    if (e instanceof Error && e.message.includes("Already initialized")) {
      return;
    }

    throw e;
  });

  resvgInitialized = true;
}

async function initializeYoga() {
  if (yogaInitialized) {
    return;
  }

  const yoga = await initYoga(
    await fetch("/yoga.wasm", { cache: "force-cache" }).then((res) =>
      res.arrayBuffer()
    )
  );
  init(yoga);

  yogaInitialized = true;
}

async function loadFont({
  family,
  weight,
  text,
}: {
  family: string;
  weight?: number;
  text?: string;
}): Promise<ArrayBuffer> {
  const searchParams = new URLSearchParams();

  searchParams.set("family", family);

  if (weight) {
    searchParams.set("weight", weight.toString());
  }

  if (text) {
    searchParams.set("text", text);
  }

  return fetch(`/playground/font?${searchParams.toString()}`).then((res) =>
    res.arrayBuffer()
  );
}

export async function renderImage(
  element: React.ReactElement,
  aspectRatio: ImageAspectRatio = "1.91:1"
): Promise<string> {
  await Promise.all([initializeResvg(), initializeYoga()]);

  const svgContent = await satori(
    {
      // taken from frames.js renderResponse middleware
      type: "div",
      key: "",
      props: {
        style: {
          display: "flex", // Use flex layout
          flexDirection: "row", // Align items horizontally
          alignItems: "stretch", // Stretch items to fill the container height
          width: "100%",
          height: "100vh", // Full viewport height
          backgroundColor: "white",
        },
        children: [
          {
            type: "div",
            key: "",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                lineHeight: 1.2,
                fontSize: 36,
                color: "black",
                flex: 1,
                overflow: "hidden",
              },
              children: element,
            },
          },
        ],
      },
    },
    {
      ...(aspectRatio === "1:1"
        ? {
            width: 1146,
            height: 1146,
          }
        : {
            width: 1146,
            height: 600,
          }),
      fonts: [
        {
          name: "Inter",
          data: await loadFont({ family: "Inter", weight: 400 }),
          weight: 400,
        },
        {
          name: "Inter",
          data: await loadFont({ family: "Inter", weight: 700 }),
          weight: 700,
        },
      ],
      embedFont: true,
      async loadAdditionalAsset(code, text) {
        if (code === "emoji") {
          return (
            "data:image/svg+xml;base64," +
            btoa(await (await loadEmoji(getIconCode(text), "twemoji")).text())
          );
        }

        const [normal, bold] = await Promise.all([
          loadFont({ family: code, text, weight: 400 }),
          loadFont({ family: code, text, weight: 700 }),
        ]);

        return [
          {
            data: normal,
            name: `satori_${code}_fallback_${text}`,
            weight: 400,
          },
          {
            data: bold,
            name: `satori_${code}_fallback_bold_${text}`,
            weight: 700,
          },
        ];
      },
    }
  );

  const svg = new Resvg(svgContent, {
    fitTo: {
      mode: "width",
      value: 1146,
    },
  });

  const pngData = svg.render();
  const pngBuffer = pngData.asPng();

  return URL.createObjectURL(new Blob([pngBuffer], { type: "image/png" }));
}

const U200D = String.fromCharCode(8205); // zero-width joiner
const UFE0Fg = /\uFE0F/g; // variation selector regex

export function getIconCode(char: string) {
  return toCodePoint(char.indexOf(U200D) < 0 ? char.replace(UFE0Fg, "") : char);
}

function toCodePoint(unicodeSurrogates: string) {
  let r: string[] = [],
    c = 0,
    p = 0,
    i = 0;
  while (i < unicodeSurrogates.length) {
    c = unicodeSurrogates.charCodeAt(i++);
    if (p) {
      r.push((65536 + ((p - 55296) << 10) + (c - 56320)).toString(16));
      p = 0;
    } else if (55296 <= c && c <= 56319) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.join("-");
}

const apis = {
  twemoji: (code: string) =>
    "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/" +
    code.toLowerCase() +
    ".svg",
  openmoji: "https://cdn.jsdelivr.net/npm/@svgmoji/openmoji@2.0.0/svg/",
  blobmoji: "https://cdn.jsdelivr.net/npm/@svgmoji/blob@2.0.0/svg/",
  noto: "https://cdn.jsdelivr.net/gh/svgmoji/svgmoji/packages/svgmoji__noto/svg/",
  fluent: (code: string) =>
    "https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/" +
    code.toLowerCase() +
    "_color.svg",
  fluentFlat: (code: string) =>
    "https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/" +
    code.toLowerCase() +
    "_flat.svg",
};

export type EmojiType = keyof typeof apis;

export function loadEmoji(code: string, type: EmojiType) {
  // https://github.com/svgmoji/svgmoji
  const api = apis[type] ?? apis.twemoji;
  if (typeof api === "function") {
    return fetch(api(code));
  }
  return fetch(`${api}${code.toUpperCase()}.svg`);
}
