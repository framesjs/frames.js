import type { FramesMiddleware } from "../../core/types";
import { generateTargetURL, isFrameDefinition } from "../../core/utils";
import { createHMACSignature } from "../../lib/crypto";
import {
  serializeJsx,
  deserializeJsx,
  type SerializedNode,
} from "../jsx-utils";

export { serializeJsx, deserializeJsx, type SerializedNode };

export function imagesWorkerMiddleware({
  imagesRoute,
  secret,
}: {
  /** The absolute URL or URL relative to the URL of this server of the image rendering worker */
  imagesRoute: string;
  /** Secret key used to sign JSX payloads */
  secret?: string;
}): FramesMiddleware<any, Record<string, never>> {
  const middleware: FramesMiddleware<any, Record<string, never>> = async (
    ctx,
    next
  ) => {
    const nextResult = await next();

    if (
      !isFrameDefinition(nextResult) ||
      typeof nextResult.image === "string"
    ) {
      return nextResult;
    }

    const imageJsonString = JSON.stringify(serializeJsx(nextResult.image));

    const searchParams = new URLSearchParams({
      time: Date.now().toString(),
      jsx: imageJsonString,
      aspectRatio: nextResult.imageOptions?.aspectRatio?.toString() || "1.91:1",
    });

    if (secret) {
      const signature = await createHMACSignature(imageJsonString, secret);

      searchParams.append("signature", signature.toString("hex"));
    }

    const imageUrl = generateTargetURL({
      baseUrl: ctx.baseUrl,
      target: imagesRoute,
    });

    imageUrl.search = searchParams.toString();

    return {
      ...nextResult,
      image: imageUrl.toString(),
    };
  };

  return middleware;
}
