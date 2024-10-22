import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogContent,
} from "@/components/ui/dialog";
import { OnTransactionFunc } from "@frames.js/render";
import type {
  ComposerActionFormResponse,
  ComposerActionState,
} from "frames.js/types";
import { useCallback, useEffect, useRef } from "react";
import { z } from "zod";

const miniappMessageSchema = z.object({
  type: z.string(),
  data: z.record(z.unknown()),
});

type ComposerFormActionDialogProps = {
  composerActionForm: ComposerActionFormResponse;
  onClose: () => void;
  onSave: (arg: { composerState: ComposerActionState }) => void;
  onTransaction?: OnTransactionFunc;
};

export function ComposerFormActionDialog({
  composerActionForm,
  onClose,
  onSave,
  onTransaction,
}: ComposerFormActionDialogProps) {
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const postMessageToIframe = useCallback(
    (message: any) => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          message,
          new URL(composerActionForm.url).origin
        );
      }
    },
    [composerActionForm.url]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const result = miniappMessageSchema.parse(event.data);

      if (result?.type === "requestTransaction") {
        onTransaction?.({
          transactionData: result.data.tx as any,
        }).then((txHash) => {
          if (txHash) {
            postMessageToIframe({
              type: "transactionResponse",
              data: {
                requestId: result.data.requestId,
                success: true,
                receipt: {
                  // address: farcasterFrameConfig.connectedAddress,
                  transactionId: txHash,
                },
              },
            });
          } else {
            postMessageToIframe({
              type: "transactionResponse",
              data: {
                requestId: result.data.requestId,
                success: false,
                message: "User rejected the request",
              },
            });
          }
        });
        return;
      }

      // on error is not called here because there can be different messages that don't have anything to do with composer form actions
      // instead we are just waiting for the correct message
      if (!result.success) {
        console.warn("Invalid message received", event.data);
        return;
      }

      if (result.data.data.cast.embeds.length > 2) {
        console.warn("Only first 2 embeds are shown in the cast");
      }

      onSaveRef.current({
        composerState: result.data.data.cast,
      });
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{composerActionForm.title}</DialogTitle>
        </DialogHeader>
        <div>
          <iframe
            className="h-[600px] w-full opacity-100 transition-opacity duration-300"
            ref={iframeRef}
            src={composerActionForm.url}
            sandbox="allow-forms allow-scripts allow-same-origin"
          ></iframe>
        </div>
        <DialogFooter>
          <span className="text-gray-400 text-sm">
            {new URL(composerActionForm.url).hostname}
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
