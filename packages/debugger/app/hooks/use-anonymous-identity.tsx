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
        postUrl: actionContext.frameButton.target ?? "",
        specification: "openframes",
      });

      const result = {
        body: {
          untrustedData: {
            ...actionContext,
            unixTimestamp: Date.now(),
          },
          clientProtocol: "anonymous@1.0",
        },
        searchParams,
      };

      return result;
    },
  };
}
