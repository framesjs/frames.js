import type {
  OnSignatureFunction,
  OnTransactionFunction,
  OnMintFunction,
  ResolveAddressFunction,
} from "@frames.js/render/unstable-types";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useChainId,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
} from "wagmi";
import { InvalidChainIdError, parseChainId } from "../lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import type { FrameDebuggerRef } from "../components/frame-debugger";

export class CouldNotChangeChainError extends Error {}

type UseSharedFrameEventHandlersReturn = {
  onTransaction: OnTransactionFunction;
  onSignature: OnSignatureFunction;
  onMint: OnMintFunction;
  resolveAddress: ResolveAddressFunction;
};

type UseSharedFrameEventHandlersOptions = {
  debuggerRef: React.MutableRefObject<FrameDebuggerRef | null> | null;
};

/**
 * This hook provides shared event handles for useFrame() hook like onMint, onTransaction, etc...
 */
export function useSharedFrameEventHandlers({
  debuggerRef,
}: UseSharedFrameEventHandlersOptions): UseSharedFrameEventHandlersReturn {
  const account = useAccount();
  const currentChainId = useChainId();
  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { toast } = useToast();

  const onTransaction: OnTransactionFunction = async function onTransaction({
    transactionData,
  }) {
    try {
      const { params, chainId } = transactionData;
      const requestedChainId = parseChainId(chainId);

      if (currentChainId !== requestedChainId) {
        await switchChainAsync({
          chainId: requestedChainId,
        }).catch((e) => {
          throw new CouldNotChangeChainError(e.message);
        });
      }

      // Send the transaction
      const transactionId = await sendTransactionAsync({
        to: params.to,
        data: params.data,
        value: BigInt(params.value || 0),
      });
      return transactionId;
    } catch (error) {
      let title: string;

      if (error instanceof InvalidChainIdError) {
        title = "Invalid chain id";
      } else if (error instanceof CouldNotChangeChainError) {
        title = "Could not change chain";
      } else {
        title = "Error sending transaction";
      }

      if (debuggerRef?.current) {
        toast({
          title,
          description: "Please check the console for more information",
          variant: "destructive",
          action: (
            <ToastAction
              altText="Show console"
              onClick={() => {
                debuggerRef.current?.showConsole();
              }}
            >
              Show console
            </ToastAction>
          ),
        });
      } else {
        toast({
          title,
          description:
            "Please check browser developer console for more information",
          variant: "destructive",
        });
      }

      console.error(error);

      return null;
    }
  };

  return {
    async resolveAddress() {
      if (account.address) {
        return account.address;
      }

      if (!openConnectModal) {
        throw new Error("openConnectModal is not available");
      }

      openConnectModal();

      return null;
    },
    async onMint(t) {
      if (!window.confirm(`Mint ${t.target}?`)) {
        return;
      }

      if (!account.address) {
        openConnectModal?.();
        return;
      }

      const searchParams = new URLSearchParams({
        target: t.target,
        taker: account.address,
      });

      try {
        const response = await fetch(`/mint?${searchParams.toString()}`);

        if (!response.ok) {
          const json = await response.json();

          throw new Error(json.message);
        }

        const json = await response.json();

        await onTransaction({ ...t, transactionData: json.data });
      } catch (e) {
        console.error(e);

        if (debuggerRef?.current) {
          toast({
            title: "Error minting",
            description: "Please check the console for more information",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Show console"
                onClick={() => {
                  debuggerRef.current?.showConsole();
                }}
              >
                Show console
              </ToastAction>
            ),
          });
        } else {
          toast({
            title: "Error minting",
            description:
              "Please check browser developer console for more information",
            variant: "destructive",
          });
        }
      }
    },
    async onSignature({ signatureData }) {
      try {
        const { params, chainId } = signatureData;
        const requestedChainId = parseChainId(chainId);

        if (currentChainId !== requestedChainId) {
          await switchChainAsync({
            chainId: requestedChainId,
          }).catch((e) => {
            throw new CouldNotChangeChainError(e.message);
          });
        }

        // Sign the data
        return await signTypedDataAsync(params);
      } catch (error) {
        let title: string;

        if (error instanceof InvalidChainIdError) {
          title = "Invalid chain id";
        } else if (error instanceof CouldNotChangeChainError) {
          title = "Could not change chain";
        } else {
          title = "Error signing data";
        }

        if (debuggerRef?.current) {
          toast({
            title,
            description: "Please check the console for more information",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Show console"
                onClick={() => {
                  debuggerRef.current?.showConsole();
                }}
              >
                Show console
              </ToastAction>
            ),
          });
        } else {
          toast({
            title,
            description:
              "Please check browser developer console for more information",
            variant: "destructive",
          });
        }

        console.error(error);

        return null;
      }
    },
    onTransaction,
  };
}
