import {
  createImagesWorkerRequestHandler,
  type ImageWorkerOptions,
} from "../handler";

export function createImagesWorker(options: ImageWorkerOptions = {}): (
  /**
   * An async function that converts a JSX element to a response
   * @param jsx - The JSX element to convert to a response
   * @param options - Options passed to the image renderer
   * @returns A promise that resolves to a response
   */
  jsxToResponse?: ImageWorkerOptions["jsxToResponse"]
) => (req: Request) => Promise<Response> {
  return (jsxToResponse) => {
    return createImagesWorkerRequestHandler({
      ...options,
      jsxToResponse,
    });
  };
}
