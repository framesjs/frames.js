import type { FrameDefinition, FramesContext } from "../../core/types";
import { resolveBaseUrl } from "../../core/utils";
import { IMAGE_WORKER_DYNAMIC_IMAGE_FETCH_HEADER } from "./constants";
import * as ImagesWorker from ".";

describe("imagesWorker", () => {
  const request = new Request("https://example.com");
  const context: FramesContext<undefined> = {
    basePath: "/",
    initialState: undefined,
    request,
    url: new URL("https://example.com"),
    baseUrl: resolveBaseUrl(request, undefined, "/"),
    __debugInfo: {},
    debug: false,
    walletAddress() {
      return Promise.resolve(undefined);
    },
  };
  const imagesRoute = "https://example.com/image";
  const mw = ImagesWorker.imagesWorkerMiddleware({ imagesRoute });

  it("should add the image URL to the frame definition", async () => {
    const frameDefinition: FrameDefinition<undefined> = {
      image: <div>Test</div>,
    };

    const result = (await mw(context, () =>
      Promise.resolve(frameDefinition)
    )) as FrameDefinition<undefined>;

    expect(typeof result.image).toBe("string");

    const url = new URL(result.image as string);

    expect(url.origin).toBe("https://example.com");
    expect(url.pathname).toBe("/image");
    expect(url.searchParams.has("jsx")).toBe(true);
  });

  it("should not add the image URL to the frame definition if it's already a string", async () => {
    const frameDefinition: FrameDefinition<undefined> = {
      image: "/image.jpg",
    };

    const result = await mw(context, () => Promise.resolve(frameDefinition));

    expect(result).toEqual({
      image: "/image.jpg",
    });
  });

  it("should not add the image URL to the frame definition if it's not a frame definition", async () => {
    const response = new Response("not a frame definition");

    const result = await mw(context, () => Promise.resolve(response));

    expect(result).toEqual(response);
  });

  it("should include signature in request if secret is provided", async () => {
    const mwWithAuth = ImagesWorker.imagesWorkerMiddleware({
      imagesRoute,
      secret: "MY_SECRET",
    });

    const frameDefinition: FrameDefinition<undefined> = {
      image: <div>Test</div>,
    };

    const result = (await mwWithAuth(context, () =>
      Promise.resolve(frameDefinition)
    )) as FrameDefinition<undefined>;

    expect(new URL(result.image as string).searchParams.has("signature")).toBe(
      true
    );
  });

  it("should pass the aspect ratio specified in the Frame Definition in the image URL", async () => {
    const frameDefinition: FrameDefinition<undefined> = {
      image: <div>Test</div>,
      imageOptions: {
        aspectRatio: "1:1",
      },
    };

    const result = (await mw(context, () =>
      Promise.resolve(frameDefinition)
    )) as FrameDefinition<undefined>;

    const url = new URL(result.image as string);

    expect(url.searchParams.get("aspectRatio")).toBe("1:1");
  });

  it("should not modify frame definition if imagesRoute is null", async () => {
    const nullImagesRouteMw = ImagesWorker.imagesWorkerMiddleware({
      imagesRoute: null,
    });

    const frameDefinition: FrameDefinition<undefined> = {
      image: <div>Test</div>,
    };

    const result = (await nullImagesRouteMw(context, () =>
      Promise.resolve(frameDefinition)
    )) as FrameDefinition<undefined>;

    expect(typeof result.image).toBe("object");
  });

  it("should warn user when `fonts` option is specified in the frame definition", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    const frameDefinition: FrameDefinition<undefined> = {
      image: <div>Test</div>,
      imageOptions: {
        fonts: [],
      },
    };

    await mw(context, () => Promise.resolve(frameDefinition));

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Warning (frames.js): `fonts` option is not supported in `imagesWorkerMiddleware`, specify fonts in the `imageRenderingOptions` option in your `createFrames` call instead."
    );

    consoleWarnSpy.mockRestore();
  });

  describe("dynamic image", () => {
    it("should generate special url for dynamic image for GET requests", async () => {
      const frameDefinition: FrameDefinition<undefined> = {
        image: <div>Test</div>,
        imageOptions: {
          dynamic: true,
        },
      };

      const result = (await mw(context, () =>
        Promise.resolve(frameDefinition)
      )) as FrameDefinition<undefined>;

      expect(typeof result.image).toBe("string");

      const url = new URL(result.image as string);

      expect(url.origin).toBe("https://example.com");
      expect(url.pathname).toBe("/image");
      expect(url.searchParams.has("url")).toBe(true);
    });

    it("should include signature in request if secret is provided for dynamic image", async () => {
      const frameDefinition: FrameDefinition<undefined> = {
        image: <div>Test</div>,
        imageOptions: {
          dynamic: true,
        },
      };
      const mwWithSecret = ImagesWorker.imagesWorkerMiddleware({
        imagesRoute,
        secret: "MY_SECRET",
      });

      const result = (await mwWithSecret(context, () =>
        Promise.resolve(frameDefinition)
      )) as FrameDefinition<undefined>;

      expect(typeof result.image).toBe("string");

      const url = new URL(result.image as string);

      expect(url.origin).toBe("https://example.com");
      expect(url.pathname).toBe("/image");
      expect(url.searchParams.has("url")).toBe(true);
      expect(url.searchParams.has("signature")).toBe(true);
    });

    it("should not do anything special for POST requests", async () => {
      const frameDefinition: FrameDefinition<undefined> = {
        image: <div>Test</div>,
        imageOptions: {
          dynamic: true,
        },
      };

      const result = (await mw(
        {
          ...context,
          request: new Request("https://example.com", {
            method: "POST",
          }),
        },
        () => Promise.resolve(frameDefinition)
      )) as FrameDefinition<undefined>;

      expect(typeof result.image).toBe("string");

      const url = new URL(result.image as string);

      expect(url.origin).toBe("https://example.com");
      expect(url.pathname).toBe("/image");
      expect(url.searchParams.has("url")).toBe(false);
      expect(url.searchParams.has("jsx")).toBe(true);
    });

    it("should redirect if there is a special header that indicates that this is a fetch from image worker handler", async () => {
      const url = new URL("https://example.com");
      url.searchParams.set("url", "https://example.com");

      const req = new Request(url, {
        headers: {
          [IMAGE_WORKER_DYNAMIC_IMAGE_FETCH_HEADER]: "true",
        },
      });
      const frameDefinition: FrameDefinition<undefined> = {
        image: <div>Test</div>,
        imageOptions: {
          dynamic: true,
        },
      };

      const result = (await mw(
        {
          ...context,
          request: req,
        },
        () => Promise.resolve(frameDefinition)
      )) as FrameDefinition<undefined>;

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(303);
    });
  });
});
