import { FRAMES_IMAGES_PARAM_FLAG } from "../../core/constants";
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

    const imageJsonString = JSON.stringify(serializeJsx(nextResult.image));

    const searchParams = new URLSearchParams({
      jsx: imageJsonString,
      aspectRatio: nextResult.imageOptions?.aspectRatio?.toString() || "1.91:1",
    });

    searchParams.append(FRAMES_IMAGES_PARAM_FLAG, "true");

    if (secret) {
      const signature = await createHMACSignature(imageJsonString, secret);

      searchParams.append("signature", signature.toString("hex"));
    }

    imageUrl.search = searchParams.toString();

    return {
      ...nextResult,
      image: imageUrl.toString(),
    };
  };

  return middleware;
}
