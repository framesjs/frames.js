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

const createCastRequestSchemaLegacy = z.object({
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

const walletActionRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.string(),
  method: z.literal("fc_requestWalletAction"),
  params: z.object({
    action: z.union([
      ethSendTransactionActionSchema,
      ethSignTypedDataV4ActionSchema,
    ]),
  }),
});

const createCastRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]),
  method: z.literal("fc_createCast"),
  params: z.object({
    cast: z.object({
      parent: z.string().optional(),
      text: z.string(),
      embeds: z.array(z.string().min(1).url()).min(1),
    }),
  }),
});

const composerActionMessageSchema = z.union([
  createCastRequestSchemaLegacy,
  walletActionRequestSchema,
  createCastRequestSchema,
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
      if (event.origin !== new URL(composerActionForm.url).origin) {
        return;
      }

      const result = composerActionMessageSchema.safeParse(event.data);

      // on error is not called here because there can be different messages that don't have anything to do with composer form actions
      // instead we are just waiting for the correct message
      if (!result.success) {
        console.warn("Invalid message received", event.data, result.error);
        return;
      }

      const message = result.data;

      if ("type" in message) {
        // Handle legacy messages
        onSaveRef.current({
          composerState: message.data.cast,
        });
      } else if (message.method === "fc_requestWalletAction") {
        if (message.params.action.method === "eth_sendTransaction") {
          onTransaction?.({
            transactionData: message.params.action,
          }).then((txHash) => {
            if (txHash) {
              postMessageToIframe({
                jsonrpc: "2.0",
                id: message.id,
                result: {
                  address: connectedAddress,
                  transactionId: txHash,
                },
              });
            } else {
              postMessageToIframe({
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: -32000,
                  message: "User rejected the request",
                },
              });
            }
          });
        } else if (message.params.action.method === "eth_signTypedData_v4") {
          onSignature?.({
            signatureData: {
              chainId: message.params.action.chainId,
              method: message.params.action.method,
              params: {
                domain: message.params.action.params.domain,
                types: message.params.action.params.types as any,
                primaryType: message.params.action.params.primaryType,
                message: message.params.action.params.message,
              },
            },
          }).then((signature) => {
            if (signature) {
              postMessageToIframe({
                jsonrpc: "2.0",
                id: message.id,
                result: {
                  address: connectedAddress,
                  transactionId: signature,
                },
              });
            } else {
              postMessageToIframe({
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: -32000,
                  message: "User rejected the request",
                },
              });
            }
          });
        }
      } else if (message.method === "fc_createCast") {
        if (message.params.cast.embeds.length > 2) {
          console.warn("Only first 2 embeds are shown in the cast");
        }

        onSaveRef.current({
          composerState: message.params.cast,
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
