import type { FramesContext, FramesMiddleware } from "../core/types";

/**
 * Every message must implement their own wallet address extraction method.
 */
export interface MessageWithWalletAddressImplementation {
  walletAddress: () => Promise<string | undefined>;
}

function isContextWithCompaitbleMessage(ctx: unknown): ctx is {
  message: MessageWithWalletAddressImplementation;
} {
  return (
    !!ctx &&
    typeof ctx === "object" &&
    "message" in ctx &&
    !!ctx.message &&
    typeof ctx.message === "object" &&
    "walletAddress" in ctx.message &&
    typeof ctx.message.walletAddress === "function"
  );
}

type WalletAddressFromMessageMiddlewareContext = Pick<
  FramesContext,
  "walletAddress"
>;

/**
 * This middleware handles wallet address extraction from frame message by providing "walletAddress()" method on context.
 *
 * Every frame message parsing middleware must run before this middleware and return walletAddress() as part of parsed message.
 *
 * This middleware is internal only and must run after globalMiddleware and before perRouteMiddleware. So the message is available.
 */
export function walletAddressMiddleware(): FramesMiddleware<
  any,
  WalletAddressFromMessageMiddlewareContext
> {
  return async (ctx, next) => {
    return next({
      walletAddress: async () => {
        if (isContextWithCompaitbleMessage(ctx)) {
          return ctx.message.walletAddress();
        }

        // eslint-disable-next-line no-console -- provide info to the developer
        console.info(
          "walletAddressFromMessageMiddleware: You called walletAddress() but there is no message or the parsed message does not contain walletAddress() method. Make sure you have run the message parsing middleware before this middleware."
        );

        return Promise.resolve(undefined);
      },
    });
  };
}
