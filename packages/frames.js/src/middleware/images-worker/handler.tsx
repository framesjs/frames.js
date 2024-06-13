import { ImageResponse } from "@vercel/og";
import React from "react"; // necessary to work on server
import type { ImageAspectRatio } from "../../types";
import { verifyHMACSignature } from "../../lib/crypto";
import { deserializeJsx, type SerializedNode } from "../jsx-utils";
import { FRAMES_IMAGES_DEBUG_FLAG } from "../../core/constants";

type ImageResponseOptions = ConstructorParameters<typeof ImageResponse>[1];

type ImageWorkerImageOptions = Omit<
  ImageResponseOptions & {
    sizes?: Record<ImageAspectRatio, { width: number; height: number }>;
  },
  "width" | "height"
>;

export type ImageWorkerOptions = {
  /** The secret used to sign the jsx payload, if not specified no authentication checks will be done */
  secret?: string;
  /** Image options to pass the default image renderer (`\@vercel/og`) */
  imageOptions?: ImageWorkerImageOptions;
  /**
   * An async function that converts a JSX element to a response
   * @param jsx - The JSX element to convert to a response
   * @param options - Options passed to the image renderer
   * @returns A promise that resolves to a response
   */
  jsxToResponse?: (
    arg0: React.ReactNode,
    options?: { aspectRatio: ImageAspectRatio }
  ) => Promise<Response>;
};

export function createImagesWorkerRequestHandler({
  secret,
  jsxToResponse,
  imageOptions,
}: ImageWorkerOptions = {}): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const serialized = url.searchParams.get("jsx");

    if (!serialized) {
      throw new Error("No jsx");
    }

    if (secret) {
      const isValid = await verifyHMACSignature(
        serialized,
        Buffer.from(url.searchParams.get("signature") ?? "", "hex"),
        secret
      );

      if (!isValid) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const json = JSON.parse(serialized) as SerializedNode[];
    const jsx = deserializeJsx(json);
    const aspectRatio = url.searchParams.get("aspectRatio") || "1.91:1";
    const emoji = url.searchParams.get(
      "emoji"
    ) as ImageWorkerImageOptions["emoji"];
    const headers = {
      ...(imageOptions?.headers || {}),
      ...JSON.parse(url.searchParams.get("headers") || "{}"),
    } as Headers;

    if (aspectRatio !== "1:1" && aspectRatio !== "1.91:1") {
      throw new Error("Invalid aspect ratio");
    }

    if (jsxToResponse) {
      const response = await jsxToResponse(jsx, { aspectRatio });
      return response;
    }

    const defaultSizes: ImageWorkerImageOptions["sizes"] = {
      "1:1": { width: 1146, height: 1146 },
      "1.91:1": { width: 1146, height: 600 },
    };
    const sizes = { ...defaultSizes, ...imageOptions?.sizes };
    const debugEnabled =
      url.searchParams.get(FRAMES_IMAGES_DEBUG_FLAG) === "true";

    const imageResponse = new ImageResponse(<Scaffold>{jsx}</Scaffold>, {
      ...imageOptions,
      emoji,
      ...sizes[aspectRatio],
      debug: imageOptions?.debug ?? debugEnabled,
    }) as Response;

    Object.entries(headers).forEach(([key, value]) => {
      imageResponse.headers.set(key, value as string);
    });

    // do not cache debug images
    if (debugEnabled) {
      imageResponse.headers.set("Cache-Control", "public, max-age: 0");
    }

    return imageResponse;
  };
}

/* eslint-disable react/no-unknown-property -- tw is a Tailwind CSS prop */
function Scaffold({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div tw="flex flex-row items-stretch relative w-full h-screen bg-white overflow-hidden">
      <div tw="flex flex-col w-full justify-center items-center text-black text-[36px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}
