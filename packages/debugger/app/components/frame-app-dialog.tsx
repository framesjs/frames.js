import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import {
  useFrameAppInIframe,
  type FramePrimaryButton,
} from "@frames.js/render/use-frame-app";
import { useWagmiProvider } from "@frames.js/render/frame-app/provider/wagmi";
import type { LaunchFrameButtonPressEvent } from "@frames.js/render/unstable-types";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { FarcasterMultiSignerInstance } from "@frames.js/render/identity/farcaster";
import { Loader2Icon } from "lucide-react";
import { useWalletClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type FrameAppDialogProps = {
  farcasterSigner: FarcasterMultiSignerInstance;
  frameState: Extract<LaunchFrameButtonPressEvent, { status: "complete" }>;
  onClose: () => void;
};

/**
 * Frames v2 dialog web view
 */
export function FrameAppDialog({
  farcasterSigner,
  frameState,
  onClose,
}: FrameAppDialogProps) {
  const { toast } = useToast();
  const walletClient = useWalletClient();
  const [isReady, setIsReady] = useState(false);
  const [primaryButton, setPrimaryButton] = useState<{
    button: FramePrimaryButton;
    callback: () => void;
  } | null>(null);
  const provider = useWagmiProvider();
  const frameApp = useFrameAppInIframe({
    debug: true,
    client: {
      clientFid: parseInt(process.env.FARCASTER_DEVELOPER_FID ?? "-1"),
      added: false,
    },
    provider,
    farcasterSigner,
    source: frameState.parseResult,
    proxyUrl: "/frames",
    onReady() {
      setIsReady(true);
    },
    onClose,
    onOpenUrl(url) {
      window.open(url, "_blank");
    },
    onPrimaryButtonSet(button, buttonCallback) {
      setPrimaryButton({
        button,
        callback: () => {
          buttonCallback();
        },
      });
    },
  });
  const { name, splashImageUrl, splashBackgroundColor } =
    frameState.frame.button.action;

  const isLoadingWallet = walletClient.status === "pending";
  const isLoading =
    isLoadingWallet || !isReady || frameApp.status === "pending";

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="w-[424px] p-0 gap-0">
        <DialogHeader className="p-6">
          <DialogTitle>{frameState.frame.button.action.name}</DialogTitle>
        </DialogHeader>
        <div className="relative h-[695px]">
          {isLoading && (
            <div
              className={cn(
                "bg-white flex items-center justify-center absolute top-0 bottom-0 left-0 right-0"
              )}
              style={{ backgroundColor: splashBackgroundColor }}
            >
              <div className="w-[200px] h-[200px] relative">
                <Image
                  alt={`${name} splash image`}
                  src={splashImageUrl}
                  width={200}
                  height={200}
                />
                <div className="absolute bottom-0 right-0">
                  <Loader2Icon
                    className="animate-spin text-primary"
                    size={40}
                  />
                </div>
              </div>
            </div>
          )}
          {!isLoadingWallet && frameApp.status === "success" && (
            <iframe
              className="h-full w-full opacity-100 transition-opacity duration-300"
              sandbox="allow-forms allow-scripts allow-same-origin"
              {...frameApp.iframeProps}
            ></iframe>
          )}
        </div>
        {!!primaryButton &&
          primaryButton.button &&
          !primaryButton.button.hidden && (
            <DialogFooter>
              <Button
                className="w-full m-1 gap-2"
                disabled={
                  primaryButton.button.disabled || primaryButton.button.loading
                }
                onClick={() => {
                  primaryButton.callback();
                }}
                size="lg"
                type="button"
              >
                {primaryButton.button.loading && (
                  <Loader2Icon className="animate-spin" />
                )}
                {primaryButton.button.text}
              </Button>
            </DialogFooter>
          )}
      </DialogContent>
    </Dialog>
  );
}
