import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { useFarcasterMultiIdentity } from "@frames.js/render/identity/farcaster";
import { WebStorage } from "@frames.js/render/identity/storage";

const sharedStorage = new WebStorage();

type Options = Omit<
  Parameters<typeof useFarcasterMultiIdentity>[0],
  "onMissingIdentity"
> & {
  selectProtocolButtonRef?: React.RefObject<HTMLButtonElement>;
};

export function useFarcasterIdentity({
  selectProtocolButtonRef,
  ...options
}: Options = {}) {
  const { toast } = useToast();

  return useFarcasterMultiIdentity({
    ...(options ?? {}),
    storage: sharedStorage,
    onMissingIdentity() {
      toast({
        title: "Please select an identity",
        description:
          "In order to test the buttons you need to select an identity first",
        variant: "destructive",
        action: selectProtocolButtonRef?.current ? (
          <ToastAction
            altText="Select identity"
            onClick={() => {
              selectProtocolButtonRef?.current?.click();
            }}
            type="button"
          >
            Select identity
          </ToastAction>
        ) : undefined,
      });
    },
  });
}
