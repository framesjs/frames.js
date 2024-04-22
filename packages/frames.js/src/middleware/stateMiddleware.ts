import type { FramesMiddleware, JsonValue } from "../core/types";
import { isFrameDefinition } from "../core/utils";

type StateMiddlewareContext<TState extends JsonValue | undefined> = {
  /**
   * State extracted from frame message.
   * - If you are on initial frame (no button pressed) the value is `initialState` value passed to `createFrames` function.
   * - If you are on frame with button pressed, the value is the state from previous frame.
   */
  state?: TState;
};

/**
 * This middleware infers a state from ctx.message or uses ctx.initialState if message is not present or does not contain a state.
 * This middleware is internal only and must run after globalMiddleware and before perRouteMiddleware. So the message is available.
 */
export function stateMiddleware<
  TState extends JsonValue | undefined,
>(): FramesMiddleware<TState, StateMiddlewareContext<TState>> {
  return async (ctx, next) => {
    if (
      "message" in ctx &&
      typeof ctx.message === "object" &&
      ctx.message &&
      "state" in ctx.message
    ) {
      let state: TState = ctx.initialState;

      // since we are stringifyng state to JSON in renderResponse middleware, we need to parse decode JSON here
      // so it is easy to use in middleware chain and frames handler
      if (ctx.message.state) {
        try {
          if (typeof ctx.message.state !== "string") {
            throw new Error("State is not a string");
          }

          state = JSON.parse(ctx.message.state) as TState;
        } catch (e) {
          // eslint-disable-next-line no-console -- provide feedback
          console.warn(
            "Failed to parse state from frame message, are you sure that the state was constructed by frames.js?"
          );
          state = ctx.initialState;
        }
      }

      const nextResult = await next({
        state,
      });

      if (isFrameDefinition(nextResult)) {
        // Include previous state if it is not present in the result
        return {
          state,
          ...nextResult,
        };
      }

      return nextResult;
    }

    return next({
      state: ctx.initialState,
    });
  };
}
