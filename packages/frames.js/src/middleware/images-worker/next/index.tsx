import { ImageResponse } from "@vercel/og";
import type { ImageResponseOptions } from "next/server";
import type { ReactElement } from "react";
import React from "react";
import type { SerializedNode } from "..";
import { deserializeJsx } from "..";
import type { ImageAspectRatio } from "../../../types";
import { verifyHMACSignature } from "../../../lib/crypto";

type ImageWorkerImageOptions = Omit<
  ImageResponseOptions,
  "width" | "height"
> & {
  sizes?: Record<ImageAspectRatio, { width: number; height: number }>;
};

export function createImagesWorker(
  options: {
    /** The secret used to sign the jsx payload, if not specified no authentication checks will be done */
    secret?: string;
    /** Image options to pass the default image renderer (`\@vercel/og`) */
    imageOptions?: ImageWorkerImageOptions;
  } = {}
): (
  /**
   * An async function that converts a JSX element to a response
   * @param jsx - The JSX element to convert to a response
   * @param options - Options passed to the image renderer
   * @returns A promise that resolves to a response
   */
  jsxToResponse?: (
    arg0: ReactElement,
    options?: { aspectRatio: ImageAspectRatio }
  ) => Promise<Response>
) => (req: Request) => Promise<Response> {
  return (jsxToResponse) => {
    return async (req: Request): Promise<Response> => {
      const url = new URL(req.url);
      const serialized = url.searchParams.get("jsx");

      if (!serialized) {
        throw new Error("No jsx");
      }

      if (options.secret) {
        const isValid = await verifyHMACSignature(
          serialized,
          Buffer.from(url.searchParams.get("signature") ?? "", "hex"),
          options.secret
        );

        if (!isValid) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      const json = JSON.parse(serialized) as SerializedNode[];
      const jsx = deserializeJsx(json);
      const aspectRatio = (url.searchParams.get("aspectRatio") ||
        "1.91:1") as ImageAspectRatio;

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
      const sizes = { ...defaultSizes, ...options.imageOptions?.sizes };

      return new ImageResponse(<Scaffold>{jsx}</Scaffold>, {
        ...options.imageOptions,
        ...sizes[aspectRatio],
      }) as Response;
    };
  };
}

/* eslint-disable react/no-unknown-property -- tw is a Tailwind CSS prop */
function Scaffold({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <div tw="flex flex-row items-stretch relative w-full h-screen bg-white overflow-hidden">
      <div tw="flex flex-col w-full justify-center items-center text-black text-[36px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}
