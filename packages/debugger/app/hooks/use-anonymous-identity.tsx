import type { SignerStateInstance } from "@frames.js/render";
import type { AnonymousOpenFramesRequest } from "frames.js/anonymous";

type AnonymousSignerInstance = SignerStateInstance<
  {},
  AnonymousOpenFramesRequest,
  {}
>;

export function useAnonymousIdentity(): AnonymousSignerInstance {
  return {
    hasSigner: true,
    onSignerlessFramePress() {
      return;
    },
    signer: {},
    async signFrameAction(actionContext) {
      const searchParams = new URLSearchParams({
        postType: actionContext.transactionId
          ? "post"
          : actionContext.frameButton.action,
        postUrl: actionContext.target ?? "",
        specification: "openframes",
      });

      return {
        body: {
          untrustedData: {
            ...actionContext,
            unixTimestamp: Date.now(),
            walletAddress() {
              return Promise.resolve(undefined);
            },
          },
          clientProtocol: "anonymous@1.0",
        },
        searchParams,
      };
    },
  };
}
