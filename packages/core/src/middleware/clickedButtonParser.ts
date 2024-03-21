import { FramesMiddleware, JsonValue } from "../types";
import { isFrameRedirect, parseButtonInformationFromTargetURL } from "../utils";

type ClickedButtonMiddlewareContext = {
  /**
   * Button that was clicked on previous frame
   */
  clickedButton?:
    | {
        action: "post" | "post_redirect";
        index: 1 | 2 | 3 | 4;
        state?: JsonValue;
      }
    | undefined;
};

/**
 * Creates middleware responsible to detect and parse clicked button, it provides clickedButton to context.
 */
export function clickedButtonParser(): FramesMiddleware<ClickedButtonMiddlewareContext> {
  return async (context, next) => {
    // clicked button always issues a POST request
    if (context.request.method !== "POST") {
      return next();
    }

    // parse clicked buttom from URL
    const clickedButton = parseButtonInformationFromTargetURL(
      context.currentURL
    );

    const result = await next({ clickedButton });

    if (clickedButton?.action === "post_redirect") {
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
    } else if (clickedButton?.action === "post") {
      // we support only frame definition as result for post button
      if (result instanceof Response || isFrameRedirect(result)) {
        console.warn(
          "The clicked button action was post, but the response was not a frame definition"
        );
      }
    }

    return next({ clickedButton });
  };
}
