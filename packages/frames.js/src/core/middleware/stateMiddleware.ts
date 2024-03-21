import { FramesMiddleware, JsonValue } from "../types";
import { parseButtonInformationFromTargetURL } from "../utils";

type StateMiddlewareContext = {
  /**
   * Button that was clicked on previous frame
   */
  state?: JsonValue | undefined;
};

/**
 * Creates middleware responsible to detect and parse clicked button, it provides clickedButton to context.
 */
export function stateMiddleware(): FramesMiddleware<StateMiddlewareContext> {
  return async (context, next) => {
    // clicked button always issues a POST request
    if (context.request.method !== "POST") {
      return next({ state: context.initialState });
    }

    // parse clicked buttom from URL
    const clickedButton = parseButtonInformationFromTargetURL(
      context.currentURL
    );

    return next({ state: clickedButton?.state });
  };
}
