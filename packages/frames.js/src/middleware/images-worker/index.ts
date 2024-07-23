import {
  FRAMES_IMAGES_DEBUG_FLAG,
  FRAMES_IMAGES_PARAM_FLAG,
} from "../../core/constants";
import type { FrameDefinition, FramesMiddleware } from "../../core/types";
import { generateTargetURL, isFrameDefinition } from "../../core/utils";
import { createHMACSignature } from "../../lib/crypto";
import {
  deserializeJsx,
  serializeJsx,
  type SerializedNode,
} from "../jsx-utils";
import {
  IMAGE_WORKER_DEFAULT_DYNAMIC_IMAGE_CACHE_CONTROL_HEADER,
  IMAGE_WORKER_DYNAMIC_IMAGE_FETCH_HEADER,
} from "./constants";
import {
  type ImageWorkerOptions,
  createImagesWorkerRequestHandler,
} from "./handler";

export { deserializeJsx, serializeJsx, type SerializedNode };
export function imagesWorkerMiddleware({
  imagesRoute,
  imageRenderingOptions,
  secret,
}: {
  /**
   * The absolute URL or URL relative to the URL of this server of the image rendering worker. Defaults to the base URL specified in `createFrames`.
   *
   * `null` disables the middleware such that it will not modify frame definitions or handle image requests.
   */
  imagesRoute?: string | null;
  /** Secret key used to sign JSX payloads */
  secret?: string;
  /** Image rendering options.
   *
   * Only used when `frames()` handler is called on the `imagesRoute` route. Can be a function that returns the options.
   */
  imageRenderingOptions?:
    | Omit<ImageWorkerOptions, "secret">
    | (() => Promise<Omit<ImageWorkerOptions, "secret">>);
} = {}): FramesMiddleware<any, Record<string, never>> {
  const middleware: FramesMiddleware<any, Record<string, never>> = async (
    ctx,
    next
  ) => {
    if (imagesRoute === null) {
      return next();
    }

    const imageUrl = generateTargetURL({
      baseUrl: ctx.baseUrl,
      target: imagesRoute || "/",
    });

    // Handle images worker request if the flag is set and the request is for the image route
    if (
      new URL(ctx.request.url).searchParams.get(FRAMES_IMAGES_PARAM_FLAG) &&
      new URL(ctx.request.url).pathname === imageUrl.pathname
    ) {
      const optionsResolved =
        typeof imageRenderingOptions === "function"
          ? await imageRenderingOptions()
          : imageRenderingOptions;

      const worker = createImagesWorkerRequestHandler({
        ...optionsResolved,
        secret,
      });
      const res = await worker(ctx.request);
      return res;
    }

    const nextResult = await next();

    if (
      !isFrameDefinition(nextResult) ||
      !isFrameDefinitionWithJsx(nextResult)
    ) {
      return nextResult;
    }

    if (ctx.request.method === "GET" && nextResult.imageOptions?.dynamic) {
      if (ctx.request.headers.has(IMAGE_WORKER_DYNAMIC_IMAGE_FETCH_HEADER)) {
        // request comes from the image worker so render the frame and redirect to its image url
        const jsx = imageToSearchParams(nextResult, imageUrl.searchParams);

        await signRequest(jsx, secret, imageUrl.searchParams);

        const headers = new Headers(nextResult.imageOptions.headers);

        if (!hasCacheControlHeader(headers)) {
          imageUrl.searchParams.set(
            "headers",
            JSON.stringify({
              ...headers,
              "Cache-Control":
                IMAGE_WORKER_DEFAULT_DYNAMIC_IMAGE_CACHE_CONTROL_HEADER,
            })
          );
        }

        return Response.redirect(imageUrl.toString(), 303);
      }

      const currentUrl = ctx.request.url;

      imageUrl.searchParams.set("url", currentUrl);
      imageUrl.searchParams.set(FRAMES_IMAGES_PARAM_FLAG, "true");

      await signRequest(currentUrl, secret, imageUrl.searchParams);

      return {
        ...nextResult,
        image: imageUrl.toString(),
      };
    }

    if (nextResult.imageOptions?.fonts !== undefined) {
      // eslint-disable-next-line no-console -- provide feedback
      console.warn(
        "Warning (frames.js): `fonts` option is not supported in `imagesWorkerMiddleware`, specify fonts in the `imageRenderingOptions` option in your `createFrames` call instead."
      );
    }

    const jsx = imageToSearchParams(nextResult, imageUrl.searchParams);

    await signRequest(jsx, secret, imageUrl.searchParams);

    if (ctx.debug) {
      const debugUrl = new URL(imageUrl);

      debugUrl.searchParams.set(FRAMES_IMAGES_DEBUG_FLAG, "true");

      ctx.__debugInfo.image = debugUrl.toString();
    }

    return {
      ...nextResult,
      image: imageUrl.toString(),
    };
  };

  return middleware;
}

function hasCacheControlHeader(headers: Headers): boolean {
  return headers.has("cache-control");
}

async function signRequest(
  data: string,
  secret: string | undefined,
  searchParams: URLSearchParams
): Promise<void> {
  if (secret) {
    const signature = await createHMACSignature(data, secret);
    searchParams.set("signature", signature.toString("hex"));
  }
}

function imageToSearchParams(
  frame: Omit<FrameDefinition<any>, "image"> & {
    image: Exclude<FrameDefinition<any>["image"], string>;
  },
  /**
   * Mutated
   */
  searchParams: URLSearchParams
): string {
  const imageJsonString = JSON.stringify(serializeJsx(frame.image));

  searchParams.set("jsx", imageJsonString);

  frame.imageOptions &&
    Object.entries(frame.imageOptions).forEach(([key, value]) => {
      if (typeof value === "object") {
        searchParams.append(key, JSON.stringify(value));
      } else if (typeof value === "string") {
        searchParams.append(key, value);
      }
    });

  searchParams.append(FRAMES_IMAGES_PARAM_FLAG, "true");

  return imageJsonString;
}

function isFrameDefinitionWithJsx(
  definition: FrameDefinition<any>
): definition is Omit<FrameDefinition<any>, "image"> & {
  image: Exclude<FrameDefinition<any>["image"], string>;
} {
  return isFrameDefinition(definition) && typeof definition.image !== "string";
}
