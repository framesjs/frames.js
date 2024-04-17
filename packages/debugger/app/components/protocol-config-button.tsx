"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import { isAddress } from "viem";
import FarcasterSignerWindow from "./farcaster-signer-config";
import { useFarcasterFrameContext } from "../hooks/use-farcaster-context";
import { useFarcasterIdentity } from "../hooks/use-farcaster-identity";
import { useXmtpFrameContext } from "../hooks/use-xmtp-context";
import { useXmtpIdentity } from "../hooks/use-xmtp-identity";

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
};
export const ProtocolConfigurationButton: React.FC<{
  onChange: (configuration: ProtocolConfiguration) => void;
  value: ProtocolConfiguration | null;
  farcasterSignerState: ReturnType<typeof useFarcasterIdentity>;
  xmtpSignerState: ReturnType<typeof useXmtpIdentity>;
  farcasterFrameContext: ReturnType<typeof useFarcasterFrameContext>;
  xmtpFrameContext: ReturnType<typeof useXmtpFrameContext>;
}> = ({
  onChange,
  value,
  farcasterSignerState,
  xmtpSignerState,
  farcasterFrameContext,
  xmtpFrameContext,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={value ? "outline" : "destructive"}>
          {value ? (
            <>
              {value.protocol} ({value.specification})
            </>
          ) : (
            <>Select a protocol</>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Tabs defaultValue={value?.protocol ?? "farcaster"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="farcaster"
              onClick={() =>
                onChange({ protocol: "farcaster", specification: "farcaster" })
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
            {/* <TabsTrigger value="lens">Lens</TabsTrigger> */}
          </TabsList>
          <TabsContent value="farcaster">
            <FarcasterSignerWindow
              farcasterUser={farcasterSignerState.signer ?? null}
              loading={!!farcasterSignerState.isLoadingSigner ?? false}
              startFarcasterSignerProcess={
                farcasterSignerState.onSignerlessFramePress
              }
              impersonateUser={farcasterSignerState.impersonateUser}
              logout={farcasterSignerState.logout}
            ></FarcasterSignerWindow>
            <div className="border-t pt-4 mt-4">
              <div className="text-md font-bold mb-2">Frame Context</div>
              <div>Cast Hash</div>
              <Input
                type="text"
                placeholder="Cast Hash"
                defaultValue={farcasterFrameContext.frameContext.castId.hash}
                onChange={(e) => {
                  farcasterFrameContext.setFrameContext((c) => ({
                    ...farcasterFrameContext.frameContext,
                    castId: {
                      fid: farcasterFrameContext.frameContext.castId.fid,
                      hash: e.target.value as unknown as `0x${string}`,
                    },
                  }));
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
                  defaultValue={xmtpFrameContext.frameContext.conversationTopic}
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
            <Button
              onClick={() => {
                onChange({ protocol: "lens", specification: "openframes" });
              }}
            >
              Save
            </Button>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
