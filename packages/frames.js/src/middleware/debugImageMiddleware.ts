import type { FramesContext, FramesMiddleware, JsonValue } from "../core/types";
import { isFrameDefinition } from "../core/utils";
import { serializeJsx } from "./jsx-utils";

/**
 * This middleware collects debug information which can be used by debugger.
 */
export function debugImageMiddleware<
  TState extends JsonValue | undefined,
>(): FramesMiddleware<TState, FramesContext<TState>> {
  return async (ctx, next) => {
    const nextResult = await next();

    if (ctx.debug && isFrameDefinition(nextResult)) {
      if (!!nextResult.image && typeof nextResult.image === "object") {
        ctx.__debugInfo.jsx = serializeJsx(nextResult.image);
      }

      return {
        ...nextResult,
      };
    }

    return nextResult;
  };
}
