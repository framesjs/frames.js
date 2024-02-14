// we need to use workers-og instead of @vercel/og because the latter is not compatible with Cloudflare Workers
// @ts-expect-error - it has the same API as @vercel/og
import { ImageResponse } from "workers-og";
import { Buffer } from "node:buffer";
import { getFrameHtml, getFrameMessageFromRequestBody } from "frames.js";

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
      const untrustedMessage = getFrameMessageFromRequestBody(body);

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

    const imgResponse = new ImageResponse(
      {
        type: "div",
        key: "1",
        props: {
          style: {
            display: "flex", // Use flex layout
            flexDirection: "row", // Align items horizontally
            alignItems: "stretch", // Stretch items to fill the container height
            width: "100%",
            height: "100vh", // Full viewport height
            backgroundColor: "white",
          },
          children: {
            type: "div",
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
              children: {
                type: "div",
                props: {
                  tw: "flex flex-col",
                  children: [
                    {
                      type: "img",
                      props: {
                        alt: "Image",
                        src: `https://picsum.photos/seed/frames.js-${state.pageIndex}/1146/600`,
                        width: 573,
                        height: 300,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        tw: "flex",
                        children: `This is slide ${state.pageIndex + 1} / ${totalPages}`,
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      {
        width: 1146,
        height: 600,
      }
    );
    const imgBuffer = await imgResponse.arrayBuffer();
    const imageUrl = `data:image/png;base64,${Buffer.from(imgBuffer).toString("base64")}`;

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
