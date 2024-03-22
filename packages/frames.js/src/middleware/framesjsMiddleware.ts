import { FramesMiddleware } from "../core/types";
import {
  isFrameRedirect,
  parseButtonInformationFromTargetURL,
  parseSearchParams,
} from "../core/utils";

type FramesjsMiddlewareContext = {
  /** the search params as an object. Empty will be an empty object */
  searchParams: {
    [k: string]: string;
  };
  /**
   * Button that was clicked on previous frame
   */
  pressedButton?:
    | {
        action: "post" | "post_redirect";
        index: 1 | 2 | 3 | 4;
      }
    | undefined;
};

/**
 * Creates middleware responsible to detect and parse clicked button, it provides pressedButton to context.
 */
export function framesjsMiddleware(): FramesMiddleware<
  any,
  FramesjsMiddlewareContext
> {
  return async (context, next) => {
    const { searchParams } = parseSearchParams(context.url);
    // clicked button always issues a POST request
    if (context.request.method !== "POST") {
      return next({ searchParams });
    }

    // parse clicked buttom from URL
    const pressedButton = parseButtonInformationFromTargetURL(context.url);

    const result = await next({ pressedButton, searchParams });

    if (pressedButton?.action === "post_redirect") {
      // check if the response is redirect, if not, warn
      if (
        (result instanceof Response &&
          (result.status < 300 || result.status > 399)) ||
        !isFrameRedirect(result)
      ) {
        console.warn(
          "The clicked button action was post_redirect, but the response was not a redirect"
        );
      }
    } else if (pressedButton?.action === "post") {
      // we support only frame definition as result for post button
      if (result instanceof Response || isFrameRedirect(result)) {
        console.warn(
          "The clicked button action was post, but the response was not a frame definition"
        );
      }
    }

    return result;
  };
}
