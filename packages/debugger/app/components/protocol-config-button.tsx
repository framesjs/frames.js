import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isAddress } from "viem";
import { useFarcasterFrameContext } from "../hooks/use-farcaster-context";
import { useFarcasterIdentity } from "../hooks/use-farcaster-identity";
import { useXmtpFrameContext } from "../hooks/use-xmtp-context";
import { useXmtpIdentity } from "../hooks/use-xmtp-identity";
import { useLensIdentity } from "../hooks/use-lens-identity";
import { useLensFrameContext } from "../hooks/use-lens-context";
import { cn } from "../lib/utils";
import FarcasterSignerWindow from "./farcaster-signer-config";
import { forwardRef, useMemo, useState } from "react";
import { WithTooltip } from "./with-tooltip";
import { useAnonymousIdentity } from "../hooks/use-anonymous-identity";

export type ProtocolConfiguration =
  | {
      protocol: "farcaster";
      specification: "farcaster";
    }
  | {
      protocol: "lens";
      specification: "openframes";
    }
  | {
      protocol: "xmtp";
      specification: "openframes";
    }
  | {
      protocol: "anonymous";
      specification: "openframes";
    };

export const protocolConfigurationMap: Record<string, ProtocolConfiguration> = {
  farcaster: {
    protocol: "farcaster",
    specification: "farcaster",
  },
  xmtp: {
    protocol: "xmtp",
    specification: "openframes",
  },
  lens: {
    protocol: "lens",
    specification: "openframes",
  },
  anonymous: {
    protocol: "anonymous",
    specification: "openframes",
  },
};

type ProtocolConfigurationButtonProps = {
  onChange: (configuration: ProtocolConfiguration) => void;
  value: ProtocolConfiguration | null;
  farcasterSignerState: ReturnType<typeof useFarcasterIdentity>;
  xmtpSignerState: ReturnType<typeof useXmtpIdentity>;
  lensSignerState: ReturnType<typeof useLensIdentity>;
  anonymousSignerState: ReturnType<typeof useAnonymousIdentity>;
  farcasterFrameContext: ReturnType<typeof useFarcasterFrameContext>;
  xmtpFrameContext: ReturnType<typeof useXmtpFrameContext>;
  lensFrameContext: ReturnType<typeof useLensFrameContext>;
};

export const ProtocolConfigurationButton = forwardRef<
  HTMLButtonElement,
  ProtocolConfigurationButtonProps
>(
  (
    {
      onChange,
      value,
      farcasterSignerState,
      xmtpSignerState,
      farcasterFrameContext,
      xmtpFrameContext,
      lensFrameContext,
      lensSignerState,
      anonymousSignerState,
    },
    ref
  ) => {
    const isSignerValid = useMemo(() => {
      let valid = false;

      if (value?.protocol === "farcaster") {
        valid =
          !!farcasterSignerState.signer &&
          farcasterSignerState.signer.status !== "pending_approval";
      }

      if (value?.protocol === "xmtp") {
        valid = !!xmtpSignerState.signer;
      }

      if (value?.protocol === "lens") {
        valid = !!lensSignerState.signer;
      }

      if (value?.protocol === "anonymous") {
        valid = !!anonymousSignerState.signer;
      }

      return valid;
    }, [
      farcasterSignerState.signer,
      value?.protocol,
      xmtpSignerState.signer,
      lensSignerState.signer,
      anonymousSignerState,
    ]);

    return (
      <Popover>
        <PopoverTrigger asChild ref={ref}>
          <WithTooltip tooltip={<p>Protocol and identity management</p>}>
            <Button variant={isSignerValid ? "outline" : "destructive"}>
              {value ? (
                <>
                  {value.protocol}{" "}
                  {value.specification === "openframes"
                    ? `(${value.specification})`
                    : // Farcaster
                      farcasterSignerState.signer?.status !== "pending_approval"
                      ? `(${
                          farcasterSignerState.signer?.fid ?? "select identity"
                        })`
                      : "select identity"}
                </>
              ) : (
                <>Select a protocol</>
              )}
            </Button>
          </WithTooltip>
        </PopoverTrigger>
        <PopoverContent>
          <Tabs value={value?.protocol} defaultValue="none">
            <TabsList className={"w-full grid grid-cols-4"}>
              <TabsTrigger
                value="anonymous"
                onClick={() =>
                  onChange({
                    protocol: "anonymous",
                    specification: "openframes",
                  })
                }
              >
                None
              </TabsTrigger>
              <TabsTrigger
                value="farcaster"
                onClick={() =>
                  onChange({
                    protocol: "farcaster",
                    specification: "farcaster",
                  })
                }
              >
                Farcaster
              </TabsTrigger>
              <TabsTrigger
                value="xmtp"
                onClick={() =>
                  onChange({ protocol: "xmtp", specification: "openframes" })
                }
              >
                XMTP
              </TabsTrigger>
              <TabsTrigger
                value="lens"
                onClick={() =>
                  onChange({ protocol: "lens", specification: "openframes" })
                }
              >
                Lens
              </TabsTrigger>
            </TabsList>
            <TabsContent value={"none"}></TabsContent>
            <TabsContent value="farcaster">
              <FarcasterSignerWindow
                farcasterUser={farcasterSignerState.signer ?? null}
                loading={!!farcasterSignerState.isLoadingSigner ?? false}
                startFarcasterSignerProcess={
                  farcasterSignerState.onCreateSignerPress
                }
                impersonateUser={farcasterSignerState.impersonateUser}
                logout={farcasterSignerState.logout}
                removeIdentity={farcasterSignerState.removeIdentity}
                storedUsers={farcasterSignerState.identities}
                onIdentitySelect={farcasterSignerState.selectIdentity}
              ></FarcasterSignerWindow>
              <div className="border-t pt-4 mt-4">
                <div className="text-md font-bold mb-2">Frame Context</div>
                <div>Cast Hash</div>
                <Input
                  type="text"
                  placeholder="Cast Hash"
                  defaultValue={farcasterFrameContext.frameContext.castId.hash}
                  onChange={(e) => {
                    farcasterFrameContext.setFrameContext({
                      ...farcasterFrameContext.frameContext,
                      castId: {
                        fid: farcasterFrameContext.frameContext.castId.fid,
                        hash: e.target.value as unknown as `0x${string}`,
                      },
                    });
                  }}
                />
                <div>Cast FID</div>
                <Input
                  type="text"
                  placeholder="Cast FID"
                  defaultValue={farcasterFrameContext.frameContext.castId.fid}
                  onChange={(e) => {
                    farcasterFrameContext.setFrameContext({
                      ...farcasterFrameContext.frameContext,
                      castId: {
                        fid: parseInt(e.target.value),
                        hash: farcasterFrameContext.frameContext.castId.hash,
                      },
                    });
                  }}
                />
                {/* Reset context button */}
                <Button
                  onClick={() => {
                    farcasterFrameContext.resetFrameContext();
                  }}
                  variant={"secondary"}
                  className="mt-2 w-full"
                >
                  Reset
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="xmtp">
              <div>
                <div>
                  {xmtpSignerState.signer ? (
                    <div>
                      <div className="mb-2">
                        Connected as{" "}
                        {xmtpSignerState.signer.walletAddress.slice(0, 6)}...
                        {xmtpSignerState.signer.walletAddress.slice(-4)}
                      </div>
                      <Button
                        variant={"secondary"}
                        className="w-full"
                        onClick={() => {
                          xmtpSignerState.logout?.();
                        }}
                      >
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => {
                        xmtpSignerState.onSignerlessFramePress();
                      }}
                    >
                      Connect XMTP
                    </Button>
                  )}
                </div>
                <div className="border-t pt-4 mt-4">
                  <div className="text-md font-bold mb-2">Frame Context</div>
                  {/* Configure context */}
                  <div>Conversation Topic</div>
                  <Input
                    type="text"
                    placeholder="Conversation Topic"
                    defaultValue={
                      xmtpFrameContext.frameContext.conversationTopic
                    }
                    onChange={(e) => {
                      xmtpFrameContext.setFrameContext((c) => ({
                        ...xmtpFrameContext.frameContext,
                        conversationTopic: e.target.value,
                      }));
                    }}
                  />
                  <div>Participant Addresses (CSV)</div>
                  <Input
                    type="text"
                    placeholder="Participant Addresses"
                    defaultValue={xmtpFrameContext.frameContext.participantAccountAddresses.join(
                      ","
                    )}
                    onChange={(e) => {
                      xmtpFrameContext.setFrameContext({
                        ...xmtpFrameContext.frameContext,
                        participantAccountAddresses: e.target.value
                          .split(",")
                          .filter((a) => isAddress(a)) as `0x${string}`[],
                      });
                    }}
                  />
                  <Button
                    onClick={() => {
                      xmtpFrameContext.resetFrameContext();
                    }}
                    variant={"secondary"}
                    className="mt-2 w-full"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="lens">
              <div>
                <div>
                  {lensSignerState?.signer ? (
                    <div>
                      <div className="mb-2">
                        Connected as {lensSignerState.signer.handle}
                      </div>
                      <Button
                        variant={"secondary"}
                        className="w-full"
                        onClick={() => {
                          lensSignerState.logout?.();
                        }}
                      >
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => {
                        lensSignerState.onSignerlessFramePress();
                      }}
                    >
                      Connect Lens
                    </Button>
                  )}
                </div>
                <div className="border-t pt-4 mt-4">
                  <div className="text-md font-bold mb-2">Frame Context</div>
                  {/* Configure context */}
                  <div>Publication ID</div>
                  <Input
                    type="text"
                    placeholder="Lens Publication ID (0x01-0x01)"
                    defaultValue={lensFrameContext.frameContext.pubId}
                    onChange={(e) => {
                      lensFrameContext.setFrameContext((c) => ({
                        ...lensFrameContext.frameContext,
                        pubId: e.target.value,
                      }));
                    }}
                  />
                  <Button
                    onClick={() => {
                      lensFrameContext.resetFrameContext();
                    }}
                    variant={"secondary"}
                    className="mt-2 w-full"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    );
  }
);

ProtocolConfigurationButton.displayName = "ProtocolConfigurationButton";
