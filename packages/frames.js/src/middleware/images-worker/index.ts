import { FRAMES_IMAGES_PARAM_FLAG } from "../../core/constants";
import type { FramesMiddleware } from "../../core/types";
import { generateTargetURL, isFrameDefinition } from "../../core/utils";
import { createHMACSignature } from "../../lib/crypto";
import {
  deserializeJsx,
  serializeJsx,
  type SerializedNode,
} from "../jsx-utils";
import { createImagesWorkerRequestHandler } from "./handler";

export { deserializeJsx, serializeJsx, type SerializedNode };
export function imagesWorkerMiddleware({
  imagesRoute,
  secret,
  handleRequests,
}: {
  /** The absolute URL or URL relative to the URL of this server of the image rendering worker. Defaults to the base URL specified in `createFrames`. */
  imagesRoute?: string;
  /** Secret key used to sign JSX payloads */
  secret?: string;
  /** Should the middleware handle requests */
  handleRequests?: boolean;
} = {}): FramesMiddleware<any, Record<string, never>> {
  const middleware: FramesMiddleware<any, Record<string, never>> = async (
    ctx,
    next
  ) => {
    if (
      handleRequests &&
      new URL(ctx.request.url).searchParams.get(FRAMES_IMAGES_PARAM_FLAG)
    ) {
      // Handle images worker request
      const worker = createImagesWorkerRequestHandler({ secret });
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

    if (handleRequests) {
      searchParams.append(FRAMES_IMAGES_PARAM_FLAG, "true");
    }

    if (secret) {
      const signature = await createHMACSignature(imageJsonString, secret);

      searchParams.append("signature", signature.toString("hex"));
    }

    const imageUrl = generateTargetURL({
      baseUrl: ctx.baseUrl,
      target: imagesRoute || "/",
    });

    imageUrl.search = searchParams.toString();

    return {
      ...nextResult,
      image: imageUrl.toString(),
    };
  };

  return middleware;
}
