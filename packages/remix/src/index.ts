import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { createFrames as coreCreateFrames } from "frames.js/core";
export { Button, type types } from "frames.js/core";

export { fetchMetadata } from "./fetchMetadata";

// @todo provide better type that can change returned handler type
export const createFrames: typeof coreCreateFrames =
  function createFramesForRemix(options: any) {
    const frames = coreCreateFrames(options);

    // @ts-expect-error
    return function createHandler(handler, handlerOptions) {
      const requestHandler = frames(handler, handlerOptions);

      return function handleRemixAPIRequest({
        request,
      }: LoaderFunctionArgs | ActionFunctionArgs) {
        return requestHandler(request);
      };
    };
  } as unknown as typeof coreCreateFrames;
