import {
  FRAMES_IMAGES_DEBUG_FLAG,
  FRAMES_IMAGES_PARAM_FLAG,
} from "../../core/constants";
import type { FramesMiddleware } from "../../core/types";
import { generateTargetURL, isFrameDefinition } from "../../core/utils";
import { createHMACSignature } from "../../lib/crypto";
import {
  deserializeJsx,
  serializeJsx,
  type SerializedNode,
} from "../jsx-utils";
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
      typeof nextResult.image === "string"
    ) {
      return nextResult;
    }

    if (nextResult.imageOptions?.fonts !== undefined) {
      // eslint-disable-next-line no-console -- provide feedback
      console.warn(
        "Warning (frames.js): `fonts` option is not supported in `imagesWorkerMiddleware`, specify fonts in the `imageRenderingOptions` option in your `createFrames` call instead."
      );
    }

    const imageJsonString = JSON.stringify(serializeJsx(nextResult.image));

    imageUrl.searchParams.set("jsx", imageJsonString);

    nextResult.imageOptions &&
      Object.entries(nextResult.imageOptions).forEach(([key, value]) => {
        if (typeof value === "object") {
          imageUrl.searchParams.append(key, JSON.stringify(value));
        } else if (typeof value === "string") {
          imageUrl.searchParams.append(key, value);
        }
      });

    imageUrl.searchParams.append(FRAMES_IMAGES_PARAM_FLAG, "true");

    if (secret) {
      const signature = await createHMACSignature(imageJsonString, secret);

      imageUrl.searchParams.append("signature", signature.toString("hex"));
    }

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
