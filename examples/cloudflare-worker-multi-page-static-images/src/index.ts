import { Buffer } from "node:buffer";
import {
  type FrameActionPayload,
  getFrameHtml,
  getFrameMessageFromRequestBody,
} from "frames.js";

import img1 from "../assets/1.png";
import img2 from "../assets/2.png";
import img3 from "../assets/3.png";
import img4 from "../assets/4.png";
import img5 from "../assets/5.png";

const images = [img1, img2, img3, img4, img5];

// These initial Types are based on bindings that don't exist in the project yet,
// you can follow the links to learn how to implement them.
interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket
}

function parsePreviousFrameState(
  searchParams: URLSearchParams,
  initialState: any
) {
  try {
    const stateValue = searchParams.get("s");

    if (!stateValue) {
      return initialState;
    }

    const parsedValue = JSON.parse(stateValue);

    return parsedValue && typeof parsedValue === "object"
      ? parsedValue
      : initialState;
  } catch (e) {
    return initialState;
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(req.url);
    const totalPages = 5;
    const state = parsePreviousFrameState(url.searchParams, { pageIndex: 0 });

    if (req.method === "POST") {
      const body = await req.json();
      const untrustedMessage = getFrameMessageFromRequestBody(
        body as FrameActionPayload
      );

      if (!untrustedMessage.data?.frameActionBody) {
        return new Response("Invalid message", { status: 400 });
      }

      /* const result = await validateFrameMessage(body, {
        hubHttpUrl: "https://nemes.farcaster.xyz:2281",
        hubRequestOptions: {},
      });
      console.log(result);

      if (!result.isValid) {
        return new Response("Invalid message", { status: 400 });
      }*/

      const buttonIndex = untrustedMessage.data?.frameActionBody?.buttonIndex;

      state.pageIndex = buttonIndex
        ? Math.max(
            0,
            (state.pageIndex + (buttonIndex === 2 ? 1 : -1)) % totalPages
          )
        : state.pageIndex;
    }

    const imageUrl = `data:image/png;base64,${Buffer.from(images[state.pageIndex]!).toString("base64")}`;

    const postUrl = new URL("/", url);

    postUrl.searchParams.set("s", JSON.stringify(state));

    const html = getFrameHtml(
      {
        version: "vNext",
        image: imageUrl,
        buttons: [
          {
            action: "post",
            label: "←",
          },
          {
            action: "post",
            label: "→",
          },
        ],
        ogImage: imageUrl,
        postUrl: postUrl.toString(),
      },
      {
        title: "Multi-page example frame",
      }
    );

    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
      },
      status: 200,
    });
  },
};
