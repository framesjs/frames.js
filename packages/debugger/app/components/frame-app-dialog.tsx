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
} from "@frames.js/render/unstable-use-frame-app";
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
  const [primaryButton, setPrimaryButton] = useState<FramePrimaryButton | null>(
    null
  );
  const frameApp = useFrameAppInIframe({
    debug: true,
    walletClient,
    farcasterSigner,
    frame: frameState.parseResult,
    onReady() {
      setIsReady(true);
    },
    onClose,
    onOpenUrl(url) {
      window.open(url, "_blank");
    },
    onPrimaryButtonSet: setPrimaryButton,
  });
  const { name, url, splashImageUrl, splashBackgroundColor } =
    frameState.frame.button.action;

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="w-[424px] h-[695px] p-0 gap-0">
        <DialogHeader className="p-6">
          <DialogTitle>{frameState.frame.button.action.name}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          {!isReady && (
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
          <iframe
            className="h-[600px] w-full opacity-100 transition-opacity duration-300"
            onLoad={frameApp.onLoad}
            src={url}
            sandbox="allow-forms allow-scripts allow-same-origin"
          ></iframe>
        </div>
        {primaryButton && !primaryButton.hidden && (
          <DialogFooter>
            <Button
              className="w-full m-1"
              disabled={primaryButton.disabled || primaryButton.loading}
              onClick={() => {
                toast({
                  title: "Feature not implemented",
                  description: "This feature is not implemented yet.",
                  variant: "destructive",
                });
              }}
              size="lg"
              type="button"
            >
              {primaryButton.text}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
