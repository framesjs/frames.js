import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OnSignatureFunc, OnTransactionFunc } from "@frames.js/render";
import type {
  ComposerActionFormResponse,
  ComposerActionState,
} from "frames.js/types";
import { useCallback, useEffect, useRef } from "react";
import { Abi, TypedDataDomain } from "viem";
import { z } from "zod";

const composerFormCreateCastMessageSchema = z.object({
  type: z.literal("createCast"),
  data: z.object({
    cast: z.object({
      parent: z.string().optional(),
      text: z.string(),
      embeds: z.array(z.string().min(1).url()).min(1),
    }),
  }),
});

const ethSendTransactionActionSchema = z.object({
  chainId: z.string(),
  method: z.literal("eth_sendTransaction"),
  attribution: z.boolean().optional(),
  params: z.object({
    abi: z.custom<Abi>(),
    to: z.custom<`0x${string}`>(
      (val): val is `0x${string}` =>
        typeof val === "string" && val.startsWith("0x")
    ),
    value: z.string().optional(),
    data: z
      .custom<`0x${string}`>(
        (val): val is `0x${string}` =>
          typeof val === "string" && val.startsWith("0x")
      )
      .optional(),
  }),
});

const ethSignTypedDataV4ActionSchema = z.object({
  chainId: z.string(),
  method: z.literal("eth_signTypedData_v4"),
  params: z.object({
    domain: z.custom<TypedDataDomain>(),
    types: z.unknown(),
    primaryType: z.string(),
    message: z.record(z.unknown()),
  }),
});

const transactionRequestBodySchema = z.object({
  requestId: z.string(),
  tx: z.union([ethSendTransactionActionSchema, ethSignTypedDataV4ActionSchema]),
});

const composerActionMessageSchema = z.discriminatedUnion("type", [
  composerFormCreateCastMessageSchema,
  z.object({
    type: z.literal("requestTransaction"),
    data: transactionRequestBodySchema,
  }),
]);

type ComposerFormActionDialogProps = {
  composerActionForm: ComposerActionFormResponse;
  onClose: () => void;
  onSave: (arg: { composerState: ComposerActionState }) => void;
  onTransaction?: OnTransactionFunc;
  onSignature?: OnSignatureFunc;
  // TODO: Consider moving this into return value of onTransaction
  connectedAddress?: `0x${string}`;
};

export function ComposerFormActionDialog({
  composerActionForm,
  onClose,
  onSave,
  onTransaction,
  onSignature,
  connectedAddress,
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
      const result = composerActionMessageSchema.safeParse(event.data);

      // on error is not called here because there can be different messages that don't have anything to do with composer form actions
      // instead we are just waiting for the correct message
      if (!result.success) {
        console.warn("Invalid message received", event.data, result.error);
        return;
      }

      const message = result.data;

      if (message.type === "requestTransaction") {
        if (message.data.tx.method === "eth_sendTransaction") {
          onTransaction?.({
            transactionData: message.data.tx,
          }).then((txHash) => {
            if (txHash) {
              postMessageToIframe({
                type: "transactionResponse",
                data: {
                  requestId: message.data.requestId,
                  success: true,
                  receipt: {
                    address: connectedAddress,
                    transactionId: txHash,
                  },
                },
              });
            } else {
              postMessageToIframe({
                type: "transactionResponse",
                data: {
                  requestId: message.data.requestId,
                  success: false,
                  message: "User rejected the request",
                },
              });
            }
          });
        } else if (message.data.tx.method === "eth_signTypedData_v4") {
          onSignature?.({
            signatureData: {
              chainId: message.data.tx.chainId,
              method: "eth_signTypedData_v4",
              params: {
                domain: message.data.tx.params.domain,
                types: message.data.tx.params.types as any,
                primaryType: message.data.tx.params.primaryType,
                message: message.data.tx.params.message,
              },
            },
          }).then((signature) => {
            if (signature) {
              postMessageToIframe({
                type: "signatureResponse",
                data: {
                  requestId: message.data.requestId,
                  success: true,
                  receipt: {
                    address: connectedAddress,
                    transactionId: signature,
                  },
                },
              });
            } else {
              postMessageToIframe({
                type: "signatureResponse",
                data: {
                  requestId: message.data.requestId,
                  success: false,
                  message: "User rejected the request",
                },
              });
            }
          });
        }
      } else if (message.type === "createCast") {
        if (message.data.cast.embeds.length > 2) {
          console.warn("Only first 2 embeds are shown in the cast");
        }

        onSaveRef.current({
          composerState: message.data.cast,
        });
      }
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
