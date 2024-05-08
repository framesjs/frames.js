import type { FramesContext, FramesMiddleware, JsonValue } from "../core/types";
import { isFrameDefinition } from "../core/utils";
import { createHMACSignature, verifyHMACSignature } from "../lib/crypto";

export class InvalidStateSignatureError extends Error {}

type SignedState<TState extends JsonValue | undefined> = {
  data: Exclude<TState, undefined>;
  __sig: string;
};

function isSignedState<TState extends JsonValue | undefined>(
  data: TState | SignedState<TState>
): data is SignedState<TState> {
  return (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    "__sig" in data &&
    typeof data.__sig === "string"
  );
}

function parseState<TState extends JsonValue | undefined>(
  state: string
): TState | SignedState<TState> {
  return JSON.parse(state) as TState | SignedState<TState>;
}

async function extractStateFromMessage<TState extends JsonValue | undefined>(
  ctx: FramesContext<TState>
): Promise<TState> {
  let state: TState = ctx.initialState;

  if (
    "message" in ctx &&
    typeof ctx.message === "object" &&
    ctx.message &&
    "state" in ctx.message
  ) {
    // since we are stringifyng state to JSON in renderResponse middleware, we need to parse decode JSON here
    // so it is easy to use in middleware chain and frames handler
    if (ctx.message.state) {
      try {
        if (typeof ctx.message.state !== "string") {
          throw new Error("State is not a string");
        }

        const parsedState = parseState<TState>(ctx.message.state);

        if (isSignedState<TState>(parsedState)) {
          // if state is signed verify it with secret, otherwise treat it as valid automatically (backward compatibility)
          if (ctx.stateSigningSecret) {
            const isValidSignature = await verifyHMACSignature(
              JSON.stringify(parsedState.data),
              Buffer.from(parsedState.__sig, "hex"),
              ctx.stateSigningSecret
            );

            if (!isValidSignature) {
              throw new InvalidStateSignatureError(
                "State signature verification failed"
              );
            } else {
              state = parsedState.data;
            }
          } else {
            // eslint-disable-next-line no-console -- provide feedback
            console.warn(
              "State is signed but no secret is provided, ignoring signature verification"
            );
            state = parsedState.data;
          }
        } else {
          state = parsedState;
        }
      } catch (e) {
        if (e instanceof InvalidStateSignatureError) {
          throw e;
        }

        // eslint-disable-next-line no-console -- provide feedback
        console.warn(
          "Failed to parse state from frame message, are you sure that the state was constructed by frames.js?"
        );
        state = ctx.initialState;
      }
    }
  }

  return state;
}

async function serializeState<TState extends JsonValue | undefined>(
  state: TState,
  ctx: FramesContext<TState>
): Promise<string | undefined> {
  if (state === undefined) {
    return undefined;
  }

  if (ctx.request.method === "POST") {
    if (ctx.stateSigningSecret) {
      const signature = await createHMACSignature(
        JSON.stringify(state),
        ctx.stateSigningSecret
      ).then((buf) => buf.toString("hex"));

      return JSON.stringify({
        data: state as Exclude<TState, undefined>,
        __sig: signature,
      } satisfies SignedState<TState>);
    }

    return JSON.stringify(state);
  }

  // eslint-disable-next-line no-console -- provide feedback to the user
  console.warn(
    "State is not supported on initial request (the one initialized when Frames are rendered for first time, that uses GET request) and will be ignored"
  );

  return undefined;
}

type StateMiddlewareContext<TState extends JsonValue | undefined> = {
  /**
   * State extracted from frame message.
   * - If you are on initial frame (no button pressed) the value is `initialState` value passed to `createFrames` function.
   * - If you are on frame with button pressed, the value is the state from previous frame.
   */
  state?: TState;
};

/**
 * This middleware handles state extraction from frame message and state serialization on response.
 *
 * If the message does not contain a state, the middleware uses `initialState` value passed to `createFrames` function.
 * If state is signed and signature is not valid, error is thrown.
 *
 * This middleware is internal only and must run after globalMiddleware and before perRouteMiddleware. So the message is available.
 */
export function stateMiddleware<
  TState extends JsonValue | undefined,
>(): FramesMiddleware<TState, StateMiddlewareContext<TState>> {
  return async (ctx, next) => {
    const stateFromMessage: TState = await extractStateFromMessage<TState>(ctx);

    const nextResult = await next({
      state: stateFromMessage,
    });

    if (isFrameDefinition(nextResult)) {
      // Include previous state if it is not present in the result
      return {
        ...nextResult,
        state: await serializeState(nextResult.state ?? stateFromMessage, ctx),
      };
    }

    return next({
      state: ctx.initialState,
    });
  };
}
