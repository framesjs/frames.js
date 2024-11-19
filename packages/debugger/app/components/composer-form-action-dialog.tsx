import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useComposerAction } from "@frames.js/render/use-composer-action";
import type { ComposerActionState } from "frames.js/types";
import { useRef } from "react";
import {
  useAccount,
  useChainId,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { parseEther } from "viem";
import { parseChainId } from "../lib/utils";
import { FarcasterMultiSignerInstance } from "@frames.js/render/identity/farcaster";
import { AlertTriangleIcon, Loader2Icon } from "lucide-react";

type ComposerFormActionDialogProps = {
  actionState: ComposerActionState;
  url: string;
  signer: FarcasterMultiSignerInstance;
  onClose: () => void;
  onSubmit: (actionState: ComposerActionState) => void;
  onToggleToCastActionDebugger: () => void;
};

export const ComposerFormActionDialog = ({
  actionState,
  signer,
  url,
  onClose,
  onSubmit,
  onToggleToCastActionDebugger,
}: ComposerFormActionDialogProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const account = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();
  const { openConnectModal } = useConnectModal();

  const result = useComposerAction({
    url,
    enabled: !signer.isLoadingSigner,
    proxyUrl: "/frames",
    actionState,
    signer,
    async resolveAddress() {
      if (account.address) {
        return account.address;
      }

      if (!openConnectModal) {
        throw new Error("Connect modal is not available");
      }

      openConnectModal();

      return null;
    },
    onError(error) {
      console.error(error);

      if (
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
                onToggleToCastActionDebugger();
              }}
            >
              Switch
            </ToastAction>
          ),
        });

        return;
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
      });
    },
    async onCreateCast(arg) {
      onSubmit(arg.cast);
    },
    async onSignature({ action, address }) {
      const { chainId, params } = action;
      const requestedChainId = parseChainId(chainId);

      if (currentChainId !== requestedChainId) {
        await switchChainAsync({ chainId: requestedChainId });
      }

      const hash = await signTypedDataAsync(params);

      return {
        address,
        hash,
      };
    },
    async onTransaction({ action, address }) {
      const { chainId, params } = action;
      const requestedChainId = parseChainId(chainId);

      if (currentChainId !== requestedChainId) {
        await switchChainAsync({ chainId: requestedChainId });
      }

      const hash = await sendTransactionAsync({
        to: params.to,
        data: params.data,
        value: parseEther(params.value ?? "0"),
      });

      return {
        address,
        hash,
      };
    },
    onMessageRespond(message, form) {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          message,
          new URL(form.url).origin
        );
      }
    },
  });

  if (result.status === "idle") {
    return null;
  }

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
        {result.status === "loading" && (
          <>
            <div className="flex items-center justify-center">
              <Loader2Icon className="text-slate-400 animate-spin" size={40} />
            </div>
          </>
        )}
        {result.status === "error" && (
          <>
            <div className="flex flex-col items-center gap-2">
              <AlertTriangleIcon className="text-red-500 mb-4" size={40} />
              <p className="font-semibold text-lg text-red-500">
                Something went wrong
              </p>
              <p className="text-red-400">Check the console</p>
            </div>
          </>
        )}
        {result.status === "success" && (
          <>
            <DialogHeader>
              <DialogTitle>{result.data.title}</DialogTitle>
            </DialogHeader>
            <div>
              <iframe
                className="h-[600px] w-full opacity-100 transition-opacity duration-300"
                ref={iframeRef}
                src={result.data.url}
                sandbox="allow-forms allow-scripts allow-same-origin"
              ></iframe>
            </div>
            <DialogFooter>
              <span className="text-gray-400 text-sm">
                {new URL(result.data.url).hostname}
              </span>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

ComposerFormActionDialog.displayName = "ComposerFormActionDialog";
