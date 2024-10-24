"use client";
/** requires client because signer is stored in local storage */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type UseFrameOptions,
  fallbackFrameContext,
  type OnTransactionFunc,
  type OnSignatureFunc,
  type FrameActionBodyPayload,
  type OnConnectWalletFunc,
  type FarcasterFrameContext,
} from "@frames.js/render";
import { attribution } from "@frames.js/render/farcaster";
import { useFrame } from "@frames.js/render/use-frame";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
import { sendTransaction, signTypedData, switchChain } from "@wagmi/core";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { zeroAddress } from "viem";
import { useAccount, useChainId, useConfig } from "wagmi";
import pkg from "../package.json";
import { FrameDebugger, FrameDebuggerRef } from "./components/frame-debugger";
import { LOCAL_STORAGE_KEYS } from "./constants";
import { MockHubActionContext } from "./utils/mock-hub-utils";
import {
  type ProtocolConfiguration,
  protocolConfigurationMap,
  ProtocolConfigurationButton,
} from "./components/protocol-config-button";
import {
  ActionDebugger,
  ActionDebuggerRef,
} from "./components/action-debugger";
import type { ParseResult } from "frames.js/frame-parsers";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  DebuggerConsoleContextProvider,
  useDebuggerConsole,
} from "./components/debugger-console";
import { ProfileSelectorModal } from "./components/lens-profile-select";
import type {
  CastActionDefinitionResponse,
  FrameDefinitionResponse,
} from "./frames/route";
import { useAnonymousIdentity } from "@frames.js/render/identity/anonymous";
import {
  useFarcasterFrameContext,
  useFarcasterMultiIdentity,
  type FarcasterSigner,
} from "@frames.js/render/identity/farcaster";
import {
  useLensFrameContext,
  useLensIdentity,
} from "@frames.js/render/identity/lens";
import {
  useXmtpFrameContext,
  useXmtpIdentity,
} from "@frames.js/render/identity/xmtp";

const FALLBACK_URL =
  process.env.NEXT_PUBLIC_DEBUGGER_DEFAULT_URL || "http://localhost:3000";

class InvalidChainIdError extends Error {}
class CouldNotChangeChainError extends Error {}

function isValidChainId(id: string): boolean {
  return id.startsWith("eip155:");
}

function parseChainId(id: string): number {
  if (!isValidChainId(id)) {
    throw new InvalidChainIdError(`Invalid chainId ${id}`);
  }

  return parseInt(id.split("eip155:")[1]!);
}

const anonymousFrameContext = {};

export default function DebuggerPage({
  searchParams,
  examples,
}: {
  searchParams: Record<string, string>;
  examples?: React.ReactNode;
}): JSX.Element {
  const debuggerRef = useRef<FrameDebuggerRef>(null);
  const actionDebuggerRef = useRef<ActionDebuggerRef>(null);
  const debuggerConsole = useDebuggerConsole();
  const { toast } = useToast();
  const urlInputRef = useRef<HTMLInputElement>(null);
  const selectProtocolButtonRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [protocolConfiguration, setProtocolConfiguration] =
    useState<ProtocolConfiguration | null>(null);
  /**
   * Parse the URL from the query string. This will also cause debugger to automatically load the frame.
   */
  const url = useMemo(() => {
    try {
      if (!searchParams.url) {
        return undefined;
      }

      const parsedUrl = new URL(searchParams.url);

      return parsedUrl.toString();
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }, [searchParams.url]);
  const [initialFrame, setInitialFrame] = useState<ParseResult>();
  const [initialAction, setInitialAction] =
    useState<CastActionDefinitionResponse>();
  const [mockHubContext, setMockHubContext] = useState<
    Partial<MockHubActionContext>
  >({
    enabled: true,
    requesterFollowsCaster: false,
    casterFollowsRequester: false,
    likedCast: false,
    recastedCast: false,
  });
  const currentChainId = useChainId();
  const config = useConfig();
  const account = useAccount();
  const { openConnectModal } = useConnectModal();

  useEffect(() => {
    const selectedProtocol = localStorage.getItem(
      LOCAL_STORAGE_KEYS.SELECTED_PROTOCOL
    );

    if (selectedProtocol) {
      setProtocolConfiguration(
        protocolConfigurationMap[selectedProtocol] || null
      );
    }

    console.log(
      ` ,---.                                             ,--.        \n/  .-',--.--. ,--,--.,--,--,--. ,---.  ,---.       \`--' ,---.  \n|  \`-,|  .--'' ,-.  ||        || .-. :(  .-'       ,--.(  .-'  \n|  .-'|  |    '-'  ||  |  |  |   --..-'  \`).--.  |  |.-'  \`) \n\`--'  \`--'    \`--\`--'\`--\`--\`--' \`----'\`----' '--'.-'  /\`----'  \n                                                 '---'         \n${pkg.name}, Version ${pkg.version}`
    );
    console.log(
      "%c" +
        "*You'll find console.log statements from your frames in the server logs in your terminal, not here.*",
      "font-weight:bold;"
    );
  }, []);

  useEffect(() => {
    if (protocolConfiguration)
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.SELECTED_PROTOCOL,
        protocolConfiguration.protocol
      );
  }, [protocolConfiguration]);

  const refreshUrl = useCallback(
    (newUrl?: string) => {
      if (!url || !protocolConfiguration?.specification) {
        return;
      }

      const searchParams = new URLSearchParams({
        url: newUrl || url,
        specification: protocolConfiguration.specification,
        actions: "true",
      });
      const proxiedUrl = `/frames?${searchParams.toString()}`;

      setIsLoading(true);
      fetch(proxiedUrl)
        .then(async (res) => {
          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.message);
          }

          return res.json() as Promise<
            CastActionDefinitionResponse | FrameDefinitionResponse
          >;
        })
        .then((json) => {
          if (json.type === "action") {
            setInitialAction(json);
            setInitialFrame(undefined);
          } else if (json.type === "frame") {
            setInitialFrame(json[protocolConfiguration.specification]);
            setInitialAction(undefined);
          }
        })
        .catch((e) => {
          toast({
            title: "Error loading url",
            description: "Please check the console for more information",
            variant: "destructive",
            action: debuggerRef.current ? (
              <ToastAction
                altText="Show console"
                onClick={() => {
                  debuggerRef.current?.showConsole();
                }}
              >
                Show console
              </ToastAction>
            ) : undefined,
          });
          console.error(e);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [url, protocolConfiguration, toast]
  );

  useEffect(() => {
    if (!url) {
      return;
    }

    if (!protocolConfiguration) {
      toast({
        title: "Select Protocol",
        description: "Please select a protocol to debug the URL",
        variant: "destructive",
        action: (
          <ToastAction
            altText="Select"
            onClick={() => {
              selectProtocolButtonRef.current?.click();
            }}
            type="button"
          >
            Select
          </ToastAction>
        ),
      });
      return;
    }

    debuggerConsole.clear();
    refreshUrl(url);
  }, [url, protocolConfiguration, refreshUrl, toast, debuggerConsole]);

  const farcasterSignerState = useFarcasterMultiIdentity({
    onMissingIdentity() {
      toast({
        title: "Please select an identity",
        description:
          "In order to test the buttons you need to select an identity first",
        variant: "destructive",
        action: (
          <ToastAction
            altText="Select identity"
            onClick={() => {
              selectProtocolButtonRef.current?.click();
            }}
            type="button"
          >
            Select identity
          </ToastAction>
        ),
      });
    },
  });
  const xmtpSignerState = useXmtpIdentity();
  const lensSignerState = useLensIdentity();
  const anonymousSignerState = useAnonymousIdentity();

  const farcasterFrameContext = useFarcasterFrameContext({
    fallbackContext: fallbackFrameContext,
  });

  const xmtpFrameContext = useXmtpFrameContext({
    fallbackContext: {
      conversationTopic: "test",
      participantAccountAddresses: account.address
        ? [account.address, zeroAddress]
        : [zeroAddress],
    },
  });

  const lensFrameContext = useLensFrameContext({
    fallbackContext: {
      pubId: "0x01-0x01",
    },
  });

  const anonymousFrameContext = {};

  const onConnectWallet: OnConnectWalletFunc = useCallback(async () => {
    if (!openConnectModal) {
      throw new Error(`openConnectModal not implemented`);
    }

    openConnectModal();
  }, [openConnectModal]);

  const onTransaction: OnTransactionFunc = useCallback(
    async ({ transactionData }) => {
      try {
        const { params, chainId } = transactionData;
        const requestedChainId = parseChainId(chainId);

        if (currentChainId !== requestedChainId) {
          await switchChain(config, {
            chainId: requestedChainId,
          }).catch((e) => {
            throw new CouldNotChangeChainError(e.message);
          });
        }

        // Send the transaction
        const transactionId = await sendTransaction(config, {
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

        toast({
          title,
          description: "Please check the console for more information",
          variant: "destructive",
          action: debuggerRef.current ? (
            <ToastAction
              altText="Show console"
              onClick={() => {
                debuggerRef.current?.showConsole();
              }}
            >
              Show console
            </ToastAction>
          ) : undefined,
        });

        console.error(error);

        return null;
      }
    },
    [currentChainId, config, toast]
  );

  const onSignature: OnSignatureFunc = useCallback(
    async ({ signatureData }) => {
      if (!account.address) {
        openConnectModal?.();
        console.info(
          "Opened connect modal because the account address is not set"
        );

        return null;
      }

      try {
        const { params, chainId } = signatureData;
        const requestedChainId = parseChainId(chainId);

        if (currentChainId !== requestedChainId) {
          await switchChain(config, {
            chainId: requestedChainId,
          }).catch((e) => {
            throw new CouldNotChangeChainError(e.message);
          });
        }

        // Sign the data
        return await signTypedData(config, params);
      } catch (error) {
        let title: string;

        if (error instanceof InvalidChainIdError) {
          title = "Invalid chain id";
        } else if (error instanceof CouldNotChangeChainError) {
          title = "Could not change chain";
        } else {
          title = "Error signing data";
        }

        toast({
          title,
          description: "Please check the console for more information",
          variant: "destructive",
          action: debuggerRef.current ? (
            <ToastAction
              altText="Show console"
              onClick={() => {
                debuggerRef.current?.showConsole();
              }}
            >
              Show console
            </ToastAction>
          ) : undefined,
        });

        console.error(error);

        return null;
      }
    },
    [account.address, currentChainId, config, openConnectModal, toast]
  );

  const useFrameConfig: Omit<
    UseFrameOptions<Record<string, unknown>, FrameActionBodyPayload>,
    "signerState" | "specification"
  > = useMemo(
    () => ({
      homeframeUrl: url,
      frame: initialFrame,
      frameActionProxy: "/frames",
      frameGetProxy: "/frames",
      frameContext: {
        ...fallbackFrameContext,
        address: account.address || fallbackFrameContext.address,
      },
      connectedAddress: account.address,
      extraButtonRequestPayload: { mockData: mockHubContext },
      onTransaction,
      onSignature,
      onConnectWallet,
      onError(error) {
        console.error(error);

        if (actionDebuggerRef.current) {
          if (error.message.includes("Must be called from composer")) {
            toast({
              title: "Error occurred",
              description:
                "It seems that you tried to call a composer action in the cast action debugger.",
              variant: "destructive",
              action: (
                <ToastAction
                  altText="Switch to composer action debugger"
                  onClick={() => {
                    actionDebuggerRef.current?.switchTo("composer-action");
                  }}
                >
                  Switch
                </ToastAction>
              ),
            });

            return;
          } else if (
            error.message.includes(
              "Unexpected composer action response from the server"
            )
          ) {
            toast({
              title: "Error occurred",
              description:
                "It seems that you tried to call a cast action in the composer action debugger.",
              variant: "destructive",
              action: (
                <ToastAction
                  altText="Switch to cast action debugger"
                  onClick={() => {
                    actionDebuggerRef.current?.switchTo("cast-action");
                  }}
                >
                  Switch
                </ToastAction>
              ),
            });

            return;
          }
        }

        toast({
          title: "Error occurred",
          description: (
            <div className="space-y-2">
              <p>{error.message}</p>
              <p>Please check the console for more information</p>
            </div>
          ),
          variant: "destructive",
          action: debuggerRef.current ? (
            <ToastAction
              altText="Show console"
              onClick={() => {
                debuggerRef.current?.showConsole();
              }}
            >
              Show console
            </ToastAction>
          ) : undefined,
        });
      },
      onMint(t) {
        if (!confirm(`Mint ${t.target}?`)) {
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

        fetch(`/mint?${searchParams.toString()}`)
          .then(async (res) => {
            if (!res.ok) {
              const json = await res.json();
              throw new Error(json.message);
            }
            return await res.json();
          })
          .then((json) => {
            onTransaction({ ...t, transactionData: json.data });
          })
          .catch((e) => {
            toast({
              title: "Error minting",
              description: "Please check the console for more information",
              variant: "destructive",
              action: debuggerRef.current ? (
                <ToastAction
                  altText="Show console"
                  onClick={() => {
                    debuggerRef.current?.showConsole();
                  }}
                >
                  Show console
                </ToastAction>
              ) : undefined,
            });
            console.error(e);
          });
      },
    }),
    [
      account.address,
      initialFrame,
      mockHubContext,
      onConnectWallet,
      onSignature,
      onTransaction,
      openConnectModal,
      toast,
      url,
    ]
  );

  const farcasterFrameConfig: UseFrameOptions<
    FarcasterSigner | null,
    FrameActionBodyPayload,
    FarcasterFrameContext
  > = useMemo(() => {
    const attributionData = process.env.NEXT_PUBLIC_FARCASTER_ATTRIBUTION_FID
      ? attribution(parseInt(process.env.NEXT_PUBLIC_FARCASTER_ATTRIBUTION_FID))
      : undefined;
    return {
      ...useFrameConfig,
      signerState: farcasterSignerState,
      specification: "farcaster",
      frameContext: {
        ...farcasterFrameContext.frameContext,
        address: account.address || farcasterFrameContext.frameContext.address,
      },
      transactionDataSuffix: attributionData,
    };
  }, [
    account.address,
    farcasterFrameContext.frameContext,
    farcasterSignerState,
    useFrameConfig,
  ]);

  const useFrameHook = useMemo(() => {
    return () => {
      const selectedProtocol = protocolConfiguration?.protocol ?? "farcaster";

      switch (selectedProtocol) {
        case "anonymous": {
          // eslint-disable-next-line react-hooks/rules-of-hooks -- this is used as a hook in FrameDebugger
          return useFrame({
            ...useFrameConfig,
            signerState: anonymousSignerState,
            specification: "openframes",
            frameContext: anonymousFrameContext,
          });
        }
        case "lens": {
          // eslint-disable-next-line react-hooks/rules-of-hooks -- this is used as a hook in FrameDebugger
          return useFrame({
            ...useFrameConfig,
            signerState: lensSignerState,
            specification: "openframes",
            frameContext: lensFrameContext.frameContext,
          });
        }
        case "xmtp": {
          // eslint-disable-next-line react-hooks/rules-of-hooks -- this is used as a hook in FrameDebugger
          return useFrame({
            ...useFrameConfig,
            signerState: xmtpSignerState,
            specification: "openframes",
            frameContext: xmtpFrameContext.frameContext,
          });
        }
        default: {
          // eslint-disable-next-line react-hooks/rules-of-hooks -- this is used as a hook in FrameDebugger
          return useFrame(farcasterFrameConfig);
        }
      }
    };
  }, [
    anonymousSignerState,
    anonymousFrameContext,
    farcasterFrameConfig,
    lensFrameContext.frameContext,
    lensSignerState,
    protocolConfiguration?.protocol,
    useFrameConfig,
    xmtpFrameContext.frameContext,
    xmtpSignerState,
  ]);

  return (
    <DebuggerConsoleContextProvider value={debuggerConsole}>
      <div className="bg-slate-50 min-h-lvh grid grid-rows-[auto_1fr]">
        <div className="flex flex-row gap-4 border-b p-2 px-4 items-center h-full bg-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="122"
            height="30"
            fill="none"
            viewBox="0 0 483 112"
          >
            <g clipPath="url(#clip0_1083_27)">
              <path
                fill="#323330"
                d="M36.255 20.252c6.042 0 11.433 1.007 16.172 3.02l-3.91 9.153c-3.021-1.184-6.368-1.777-10.04-1.777-2.785 0-4.8.504-6.043 1.51-1.185 1.008-1.777 2.666-1.777 4.977v6.309h15.372l-1.6 9.774H30.657v34.478h-13.95V53.218H6.753v-9.774h9.953V36.69c0-4.857 1.688-8.796 5.064-11.818 3.436-3.08 8.265-4.62 14.485-4.62zM95.489 39.09c2.844 0 5.45.474 7.82 1.421l-2.577 19.727h-8.886V51.53c-2.607.474-4.917 1.896-6.931 4.265-2.014 2.37-3.584 5.361-4.71 8.975v13.507h9.33v9.419h-29.59v-9.42h6.22V49.843h-6.22v-9.33h16.973l2.488 10.574c1.718-4.029 3.88-7.02 6.486-8.975 2.607-2.014 5.806-3.021 9.597-3.021zm57.013 35.01c0 1.718.237 2.992.711 3.821.474.83 1.274 1.452 2.399 1.866l-2.932 9.242c-2.844-.296-5.213-.918-7.109-1.866-1.896-1.007-3.377-2.459-4.443-4.355-1.777 2.074-4.028 3.673-6.753 4.799-2.725 1.066-5.628 1.6-8.708 1.6-4.858 0-8.738-1.363-11.641-4.088-2.903-2.784-4.354-6.368-4.354-10.752 0-5.095 2.014-9.034 6.042-11.818 4.029-2.844 9.686-4.266 16.972-4.266h6.309v-1.688c0-4.858-3.11-7.286-9.33-7.286-1.599 0-3.613.236-6.042.71a45.722 45.722 0 00-6.931 1.778l-3.199-9.33a55.21 55.21 0 019.419-2.578c3.317-.651 6.309-.977 8.975-.977 13.743 0 20.615 5.569 20.615 16.706V74.1zm-22.037 5.065c1.599 0 3.199-.444 4.798-1.333 1.659-.947 2.903-2.221 3.732-3.82V66.28h-3.465c-7.583 0-11.374 2.37-11.374 7.108 0 1.837.533 3.259 1.599 4.266 1.126 1.007 2.696 1.51 4.71 1.51zm70.52-40.253c3.376 0 5.835 1.126 7.375 3.377 1.599 2.191 2.399 5.687 2.399 10.485v34.922h-11.996V54.374c0-1.718-.178-2.903-.533-3.555-.296-.652-.889-.977-1.777-.977-1.659 0-3.288 1.036-4.887 3.11v34.744h-9.953V54.374c0-1.718-.177-2.903-.533-3.555-.296-.652-.888-.977-1.777-.977-1.659 0-3.288 1.036-4.887 3.11v34.744h-12.174V40.512h10.219l.977 4.531c1.54-2.132 3.051-3.672 4.532-4.62 1.54-1.008 3.317-1.511 5.332-1.511 1.836 0 3.376.474 4.62 1.422 1.244.888 2.133 2.28 2.666 4.176 3.199-3.732 6.665-5.598 10.397-5.598zm30.533 29.324c.888 7.168 4.679 10.752 11.374 10.752 4.028 0 8.056-1.304 12.084-3.91l5.599 7.642c-2.311 2.014-5.065 3.613-8.264 4.798-3.199 1.126-6.724 1.688-10.575 1.688-5.272 0-9.745-1.036-13.417-3.11-3.673-2.132-6.458-5.065-8.353-8.797-1.837-3.791-2.755-8.175-2.755-13.15 0-4.74.889-9.005 2.666-12.797 1.836-3.85 4.473-6.871 7.908-9.063 3.496-2.251 7.642-3.377 12.441-3.377 4.502 0 8.412.977 11.729 2.932 3.318 1.896 5.865 4.68 7.642 8.353 1.836 3.614 2.755 7.938 2.755 12.974 0 1.955-.089 3.643-.267 5.065h-30.567zm8.708-19.905c-2.548 0-4.591.948-6.132 2.844-1.54 1.836-2.458 4.68-2.754 8.53h17.327c-.118-7.583-2.932-11.374-8.441-11.374zm51.326 30.834c2.429 0 4.324-.355 5.687-1.066 1.421-.77 2.132-1.896 2.132-3.377 0-1.066-.296-1.925-.888-2.577-.533-.651-1.57-1.273-3.11-1.866-1.541-.651-3.94-1.421-7.198-2.31-4.739-1.244-8.353-2.962-10.841-5.154-2.488-2.25-3.732-5.331-3.732-9.241 0-4.325 1.777-7.85 5.332-10.575 3.613-2.724 8.649-4.087 15.106-4.087 7.464 0 13.832 1.925 19.105 5.776l-5.599 8.264c-4.324-2.666-8.678-3.999-13.062-3.999-2.31 0-4.028.296-5.154.889-1.066.592-1.599 1.51-1.599 2.754 0 .83.266 1.54.8 2.133.592.533 1.658 1.096 3.198 1.688 1.6.593 3.97 1.333 7.109 2.222 3.377.948 6.132 1.984 8.264 3.11 2.192 1.125 3.88 2.636 5.065 4.532 1.185 1.895 1.777 4.324 1.777 7.286 0 3.318-1.007 6.161-3.021 8.53-2.014 2.37-4.709 4.147-8.086 5.332-3.377 1.185-7.109 1.777-11.196 1.777-4.384 0-8.353-.622-11.908-1.866-3.554-1.244-6.575-2.991-9.063-5.242l7.02-7.909c4.265 3.318 8.886 4.976 13.862 4.976zm44.928.09c0-2.667.948-4.977 2.843-6.932 1.955-1.955 4.295-2.932 7.02-2.932 2.725 0 5.036.977 6.931 2.932 1.955 1.955 2.933 4.265 2.933 6.931 0 2.725-.978 5.065-2.933 7.02-1.895 1.955-4.206 2.932-6.931 2.932-2.725 0-5.065-.977-7.02-2.932-1.895-1.955-2.843-4.295-2.843-7.02zm69.364-63.446c2.37 0 4.325.77 5.865 2.31 1.599 1.48 2.399 3.347 2.399 5.598s-.8 4.147-2.399 5.687c-1.54 1.481-3.495 2.221-5.865 2.221-2.488 0-4.502-.74-6.042-2.22-1.54-1.482-2.31-3.378-2.31-5.688 0-2.251.77-4.117 2.31-5.598 1.599-1.54 3.613-2.31 6.042-2.31zm9.064 58.203c0 6.694-1.244 12.232-3.732 16.616-2.488 4.443-6.191 7.968-11.108 10.574-4.857 2.666-11.107 4.74-18.749 6.221l-2.133-10.752c5.036-1.126 9.094-2.518 12.174-4.177 3.14-1.659 5.51-3.88 7.109-6.664 1.599-2.844 2.399-6.487 2.399-10.93V50.108h-16.883v-9.596h30.923v33.5zm36.486 5.153c2.429 0 4.325-.355 5.687-1.066 1.422-.77 2.133-1.896 2.133-3.377 0-1.066-.296-1.925-.889-2.577-.533-.651-1.569-1.273-3.11-1.866-1.54-.651-3.939-1.421-7.197-2.31-4.739-1.244-8.353-2.962-10.841-5.154-2.488-2.25-3.732-5.331-3.732-9.241 0-4.325 1.777-7.85 5.331-10.575 3.614-2.724 8.649-4.087 15.107-4.087 7.464 0 13.832 1.925 19.104 5.776l-5.598 8.264c-4.324-2.666-8.678-3.999-13.062-3.999-2.311 0-4.028.296-5.154.889-1.066.592-1.599 1.51-1.599 2.754 0 .83.266 1.54.799 2.133.593.533 1.659 1.096 3.199 1.688 1.6.593 3.969 1.333 7.109 2.222 3.377.948 6.131 1.984 8.264 3.11 2.192 1.125 3.88 2.636 5.065 4.532 1.185 1.895 1.777 4.324 1.777 7.286 0 3.318-1.007 6.161-3.021 8.53-2.014 2.37-4.71 4.147-8.086 5.332-3.377 1.185-7.109 1.777-11.197 1.777-4.383 0-8.352-.622-11.907-1.866-3.554-1.244-6.575-2.991-9.063-5.242l7.019-7.909c4.266 3.318 8.886 4.976 13.862 4.976z"
              ></path>
            </g>
            <defs>
              <clipPath id="clip0_1083_27">
                <path fill="#fff" d="M0 0H483V111.37H0z"></path>
              </clipPath>
            </defs>
          </svg>
          <form
            className="flex flex-row"
            onSubmit={(e) => {
              e.preventDefault();

              const newUrl =
                new FormData(e.currentTarget).get("url")?.toString() || "";

              if (!newUrl) {
                toast({
                  title: "Missing URL",
                  description: "Please provide a URL to debug",
                  variant: "destructive",
                  action: (
                    <ToastAction
                      altText="Fix"
                      onClick={() => {
                        urlInputRef.current?.focus();
                      }}
                      type="button"
                    >
                      Fix
                    </ToastAction>
                  ),
                });
                return;
              }

              try {
                const parsedUrl = new URL(newUrl);

                if (
                  parsedUrl.protocol !== "http:" &&
                  parsedUrl.protocol !== "https:"
                ) {
                  throw new Error("Invalid protocol");
                }

                if (!protocolConfiguration) {
                  toast({
                    title: "Select Protocol",
                    description: "Please select a protocol to debug the URL",
                    variant: "destructive",
                    action: (
                      <ToastAction
                        altText="Select"
                        onClick={() => {
                          selectProtocolButtonRef.current?.click();
                        }}
                        type="button"
                      >
                        Select
                      </ToastAction>
                    ),
                  });
                  return;
                }

                if (searchParams.url === parsedUrl.toString()) {
                  location.reload();
                }

                router.push(`?url=${encodeURIComponent(parsedUrl.toString())}`);
              } catch (e) {
                toast({
                  title: "Invalid URL",
                  description:
                    "URL must start with http:// or https:// and be in valid format",
                  variant: "destructive",
                  action: (
                    <ToastAction
                      altText="Fix"
                      onClick={() => {
                        urlInputRef.current?.focus();
                      }}
                      type="button"
                    >
                      Fix
                    </ToastAction>
                  ),
                });

                return;
              }
            }}
          >
            <Input
              type="text"
              name="url"
              ref={urlInputRef}
              className="w-[400px] px-2 py-1 border border-gray-400 rounded-l rounded-r-none"
              defaultValue={url ?? FALLBACK_URL}
              placeholder="Enter URL"
            />
            <Button
              className="rounded-l-none"
              disabled={isLoading}
              type="submit"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Debug
            </Button>
          </form>

          <ProtocolConfigurationButton
            onChange={(spec) => {
              setProtocolConfiguration(spec);
            }}
            value={protocolConfiguration}
            farcasterSignerState={farcasterSignerState}
            xmtpSignerState={xmtpSignerState}
            anonymousSignerState={anonymousSignerState}
            farcasterFrameContext={farcasterFrameContext}
            xmtpFrameContext={xmtpFrameContext}
            ref={selectProtocolButtonRef}
            lensFrameContext={lensFrameContext}
            lensSignerState={lensSignerState}
          ></ProtocolConfigurationButton>

          <div className="ml-auto">
            <ConnectButton showBalance={false}></ConnectButton>
          </div>
        </div>
        {url ? (
          <>
            {initialAction && (
              <div>
                <ActionDebugger
                  actionMetadataItem={initialAction}
                  farcasterFrameConfig={farcasterFrameConfig}
                  refreshUrl={refreshUrl}
                  mockHubContext={mockHubContext}
                  setMockHubContext={setMockHubContext}
                  hasExamples={!!examples}
                  ref={actionDebuggerRef}
                ></ActionDebugger>
              </div>
            )}

            {initialFrame &&
              !!protocolConfiguration?.protocol &&
              !!protocolConfiguration.specification && (
                <FrameDebugger
                  useFrameHook={useFrameHook}
                  // use key so the frame debugger state is completely reset when protocol changes
                  key={protocolConfiguration.protocol}
                  url={url}
                  mockHubContext={mockHubContext}
                  setMockHubContext={setMockHubContext}
                  specification={protocolConfiguration?.specification}
                  ref={debuggerRef}
                  hasExamples={!!examples}
                ></FrameDebugger>
              )}
          </>
        ) : (
          examples
        )}
      </div>
      {lensSignerState.showProfileSelector && (
        <ProfileSelectorModal
          profiles={lensSignerState.availableProfiles}
          onSelect={lensSignerState.handleSelectProfile}
          show={lensSignerState.showProfileSelector}
          onClose={lensSignerState.closeProfileSelector}
        />
      )}
    </DebuggerConsoleContextProvider>
  );
}
