import type { AnonymousOpenFramesRequest } from "frames.js/anonymous";
import { useCallback, useMemo } from "react";
import type { SignerStateInstance } from "@frames.js/render";
import type {
  SignerStateActionContext,
  SignFrameActionFunction,
} from "../../types";

export type AnonymousSigner = {};

export type AnonymousFrameContext = {};

type AnonymousSignerInstance = SignerStateInstance<
  AnonymousSigner,
  AnonymousOpenFramesRequest,
  AnonymousFrameContext
>;

const onSignerlessFramePress = (): Promise<void> => Promise.resolve();
const logout = (): Promise<void> => Promise.resolve();
const signer: AnonymousSigner = {};

export function useAnonymousIdentity(): AnonymousSignerInstance {
  const signFrameAction: SignFrameActionFunction<
    SignerStateActionContext<AnonymousSigner, AnonymousFrameContext>,
    AnonymousOpenFramesRequest
  > = useCallback((actionContext) => {
    const searchParams = new URLSearchParams({
      postType: actionContext.transactionId
        ? "post"
        : actionContext.frameButton.action,
      postUrl: actionContext.target ?? "",
      specification: "openframes",
    });

    return Promise.resolve({
      body: {
        untrustedData: {
          ...actionContext,
          unixTimestamp: Date.now(),
        },
        clientProtocol: "anonymous@1.0",
      },
      searchParams,
    });
  }, []);

  return useMemo(
    () => ({
      hasSigner: true,
      onSignerlessFramePress,
      signer,
      isLoadingSigner: false,
      logout,
      signFrameAction,
    }),
    [signFrameAction]
  );
}
