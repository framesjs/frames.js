import { FramesMiddleware, JsonValue } from "../types";
import { parseButtonInformationFromTargetURL } from "../utils";

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
    // parse clicked buttom from URL
    const clickedButton = parseButtonInformationFromTargetURL(
      context.currentURL
    );

    return next({ clickedButton });
  };
}
