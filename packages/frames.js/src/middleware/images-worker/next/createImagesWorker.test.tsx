import type { NextRequest } from "next/server";
import type { FrameDefinition, FramesContext } from "../../../core/types";
import { resolveBaseUrl } from "../../../core/utils";
import { imagesWorkerMiddleware } from "../imagesWorker";
import { createImagesWorker } from "./createImagesWorker";

describe("createImagesWorker", () => {
  const frameRequest = new Request("https://example.com");
  const context: FramesContext<undefined> = {
    basePath: "/",
    initialState: undefined,
    request: frameRequest,
    url: new URL("https://example.com"),
    baseUrl: resolveBaseUrl(frameRequest, undefined, "/"),
  };
  const imagesRouteUrl = "https://example.com/image";

  it("should render an image with no configuration", async () => {
    const frame: FrameDefinition<undefined> = {
      image: <div>Test</div>,
    };

    const mw = imagesWorkerMiddleware({
      imagesRoute: imagesRouteUrl,
    });

    const result = (await mw(context, () =>
      Promise.resolve(frame)
    )) as FrameDefinition<undefined>;

    expect(typeof result.image).toBe("string");

    const request = new Request(result.image as string);

    const imagesRoute = createImagesWorker();

    const GET = imagesRoute();

    const response = await GET(request as unknown as NextRequest);

    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("should return an unauthorized response if the signature is invalid", async () => {
    const frame: FrameDefinition<undefined> = {
      image: <div>Test</div>,
    };

    const mw = imagesWorkerMiddleware({
      secret: "MY_TEST_SECRET",
      imagesRoute: imagesRouteUrl,
    });

    const result = (await mw(context, () =>
      Promise.resolve(frame)
    )) as FrameDefinition<undefined>;

    expect(typeof result.image).toBe("string");

    const request = new Request(result.image as string);

    const imagesRoute = createImagesWorker({
      secret: "SOME_INCORRECT_SECRET",
    });

    const GET = imagesRoute();

    const response = await GET(request as unknown as NextRequest);

    expect(response.status).toBe(401);
  });

  it("should render using a custom renderer if provided", async () => {
    const frame: FrameDefinition<undefined> = {
      image: <div>Test</div>,
    };

    const mw = imagesWorkerMiddleware({
      imagesRoute: imagesRouteUrl,
    });

    const result = (await mw(context, () =>
      Promise.resolve(frame)
    )) as FrameDefinition<undefined>;

    expect(typeof result.image).toBe("string");

    const request = new Request(result.image as string);

    const imagesRoute = createImagesWorker({
      imageOptions: {
        width: 100,
        height: 100,
      },
    });

    const GET = imagesRoute(async (_) => new Response("Test", { status: 200 }));

    const response = await GET(request as unknown as NextRequest);

    expect(response.headers.get("content-type")).toBe(
      "text/plain;charset=UTF-8"
    );
    expect(await response.text()).toBe("Test");
  });
});
