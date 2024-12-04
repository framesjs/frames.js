import {
  constructJSONFarcasterSignatureAccountAssociationPaylod,
  sign,
  type SignResult,
} from "frames.js/farcaster-v2/json-signature";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccount, useSignMessage, useSwitchChain } from "wagmi";
import { FormEvent, useCallback, useState } from "react";
import { CopyIcon, CopyCheckIcon, CopyXIcon, Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFarcasterIdentity } from "../hooks/useFarcasterIdentity";
import { optimism } from "viem/chains";
import { useToast } from "@/components/ui/use-toast";
import { useCopyToClipboard } from "../hooks/useCopyToClipboad";

type FarcasterDomainAccountAssociationDialogProps = {
  onClose: () => void;
};

export function FarcasterDomainAccountAssociationDialog({
  onClose,
}: FarcasterDomainAccountAssociationDialogProps) {
  const copyCompact = useCopyToClipboard();
  const copyJSON = useCopyToClipboard();
  const account = useAccount();
  const { toast } = useToast();
  const farcasterSigner = useFarcasterIdentity();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [associationResult, setAssociationResult] = useState<SignResult | null>(
    null
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const data = new FormData(event.currentTarget);

      try {
        if (farcasterSigner.signer?.status !== "approved") {
          throw new Error("Farcaster signer is not approved");
        }

        if (!account.address) {
          throw new Error("Account address is not available");
        }

        const domain = data.get("domain");

        if (typeof domain !== "string" || !domain) {
          throw new Error("Domain is required");
        }

        setIsGenerating(true);

        await switchChainAsync({
          chainId: optimism.id,
        });

        const result = await sign({
          fid: farcasterSigner.signer.fid,
          payload:
            constructJSONFarcasterSignatureAccountAssociationPaylod(domain),
          signer: {
            type: "custody",
            custodyAddress: account.address,
          },
          signMessage(message) {
            return signMessageAsync({
              message,
            });
          },
        });

        setAssociationResult(result);
      } catch (e) {
        console.error(e);
        toast({
          title: "An error occurred",
          description: "Please check the console for more information",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [
      account.address,
      farcasterSigner.signer,
      signMessageAsync,
      switchChainAsync,
      toast,
    ]
  );

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
          <DialogTitle>Domain Account Association</DialogTitle>
        </DialogHeader>
        {!associationResult && (
          <form id="domain-account-association-form" onSubmit={handleSubmit}>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              name="domain"
              pattern="^.+\..+$"
              required
              type="text"
            />
          </form>
        )}
        {associationResult && (
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="domain-account-association-form-compact-signature">
                Compact signature
              </Label>
              <div className="flex w-full items-center space-x-2">
                <Input
                  id="domain-account-association-form-compact-signature"
                  readOnly
                  value={associationResult.compact}
                />
                <Button
                  onClick={() => {
                    copyCompact.copyToClipboard(associationResult.compact);
                  }}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  {copyCompact.copyState === "idle" && <CopyIcon size={14} />}
                  {copyCompact.copyState === "copied" && (
                    <CopyCheckIcon size={14} />
                  )}
                  {copyCompact.copyState === "failed" && (
                    <CopyXIcon size={14} />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="domain-account-association-form-json-signature">
                JSON
              </Label>
              <div className="relative">
                <textarea
                  className="p-2 bg-gray-100 rounded-md font-mono w-full resize-none text-sm"
                  readOnly
                  name="json"
                  rows={5}
                  id="domain-account-association-form-json-signature"
                  value={JSON.stringify(associationResult.json, null, 2)}
                ></textarea>
                <Button
                  className="absolute top-0 right-0 p-2"
                  onClick={() => {
                    copyJSON.copyToClipboard(
                      JSON.stringify(associationResult.json, null, 2)
                    );
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {copyJSON.copyState === "idle" && <CopyIcon size={14} />}
                  {copyJSON.copyState === "copied" && (
                    <CopyCheckIcon size={14} />
                  )}
                  {copyJSON.copyState === "failed" && <CopyXIcon size={14} />}
                </Button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          {associationResult && (
            <Button
              onClick={() => {
                setAssociationResult(null);
              }}
              type="button"
            >
              Reset
            </Button>
          )}
          {!associationResult && (
            <Button
              disabled={isGenerating}
              form="domain-account-association-form"
              type="submit"
            >
              {isGenerating ? (
                <>
                  <Loader2Icon className="animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
