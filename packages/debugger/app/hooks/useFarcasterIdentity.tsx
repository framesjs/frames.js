import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { useFarcasterMultiIdentity } from "@frames.js/render/identity/farcaster";
import { WebStorage } from "@frames.js/render/identity/storage";
import { useProtocolSelector } from "../providers/ProtocolSelectorProvider";

const sharedStorage = new WebStorage();

type Options = Omit<
  Parameters<typeof useFarcasterMultiIdentity>[0],
  "onMissingIdentity"
>;

export function useFarcasterIdentity(options: Options = {}) {
  const { toast } = useToast();
  const protocolSelector = useProtocolSelector();

  return useFarcasterMultiIdentity({
    ...(options ?? {}),
    storage: sharedStorage,
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
              protocolSelector.open();
            }}
            type="button"
          >
            Select identity
          </ToastAction>
        ),
      });
    },
  });
}
