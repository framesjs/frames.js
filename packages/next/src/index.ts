import { createFrames as coreCreateFrames } from "frames.js/core";
export { Button, type types } from "frames.js/core";

export { fetchMetadata } from "./fetchMetadata";

export const createFrames: typeof coreCreateFrames =
  function createFramesForNextJS(options: any) {
    const frames = coreCreateFrames(options);

    // @ts-expect-error
    return function createHandler(handler, handlerOptions) {
      const requestHandler = frames(handler, handlerOptions);

      return function handleNextJSApiRequest(req: Request) {
        // properly set the url on the request so it is available in context.currentURL
        return requestHandler(req);
      };
    };
  } as unknown as typeof coreCreateFrames;
