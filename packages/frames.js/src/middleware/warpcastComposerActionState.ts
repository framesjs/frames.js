import type {
  ComposerActionState,
  ComposerActionStateFromMessage,
  FramesContext,
  FramesMiddleware,
} from "../core/types";

function isComposerActionState(
  value: unknown
): value is ComposerActionStateFromMessage {
  if (
    typeof value === "object" &&
    !!value &&
    "cast" in value &&
    !!value.cast &&
    typeof value.cast === "object" &&
    "text" in value.cast &&
    typeof value.cast.text === "string" &&
    "embeds" in value.cast &&
    Array.isArray(value.cast.embeds) &&
    value.cast.embeds.every((embed) => typeof embed === "string" && !!embed)
  ) {
    return true;
  }

  return false;
}

function extractComposerActionStateFromMessage(
  ctx: FramesContext<any>
): ComposerActionState | undefined {
  if (
    "message" in ctx &&
    typeof ctx.message === "object" &&
    !!ctx.message &&
    "state" in ctx.message &&
    !!ctx.message.state
  ) {
    // since warpcast specifies that state should be URL encoded JSON containing the state, validate that
    try {
      if (typeof ctx.message.state !== "string") {
        throw new Error("State is not a string");
      }

      const jsonString = decodeURIComponent(ctx.message.state);
      const parsedState = JSON.parse(jsonString) as unknown;

      if (isComposerActionState(parsedState)) {
        return parsedState.cast;
      }

      throw new Error("Invalid state shape");
    } catch (e) {
      // eslint-disable-next-line no-console -- provide feedback
      console.warn(
        `warpcastComposerActionState: Could not parse composer action state.`
      );

      return undefined;
    }
  }

  return undefined;
}

type WarpcastComposerActionState = {
  /**
   * State extracted from frame message. If missing it means that the action has not been called from composer.
   */
  composerActionState?: ComposerActionState;
};

/**
 * This middleware is responsible for detecting and extracting composer action state from message.
 */
export function warpcastComposerActionState(): FramesMiddleware<
  any,
  WarpcastComposerActionState
> {
  return async (ctx, next) => {
    const composerActionState = extractComposerActionStateFromMessage(ctx);

    if (!composerActionState) {
      return next();
    }

    return next({
      composerActionState,
    });
  };
}
