import { InfoIcon } from "lucide-react";
import type { CastActionDefinitionResponse } from "../frames/route";
import IconByName from "./octicons";
import { useToast } from "@/components/ui/use-toast";
import { ActionInfo } from "./action-info";
import { defaultTheme, fallbackFrameContext } from "@frames.js/render";
import { useCastAction } from "@frames.js/render/use-cast-action";
import { FrameDebugger } from "./frame-debugger";
import { useFarcasterIdentity } from "../hooks/useFarcasterIdentity";
import { type Dispatch, type SetStateAction, useState } from "react";
import type { MockHubActionContext } from "../utils/mock-hub-utils";

type CastActionDebuggerProps = {
  actionMetadataItem: CastActionDefinitionResponse;
  onRefreshUrl: () => void;
  mockHubContext?: Partial<MockHubActionContext>;
  setMockHubContext?: Dispatch<SetStateAction<Partial<MockHubActionContext>>>;
  hasExamples: boolean;
};

export function CastActionDebugger({
  actionMetadataItem,
  onRefreshUrl,
  mockHubContext,
  setMockHubContext,
  hasExamples,
}: CastActionDebuggerProps) {
  const { toast } = useToast();
  const farcasterIdentity = useFarcasterIdentity();
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const castAction = useCastAction({
    ...(postUrl
      ? {
          enabled: true,
          postUrl,
        }
      : {
          enabled: false,
          postUrl: "",
        }),
    castId: fallbackFrameContext.castId,
    proxyUrl: "/frames",
    signer: farcasterIdentity,
    onInvalidResponse(response) {
      console.error(response);

      toast({
        title: "Invalid action response",
        description:
          "Please check the browser developer console for more information",
        variant: "destructive",
      });
    },
    onMessageResponse(response) {
      console.log(response);
      toast({
        description: response.message,
      });
    },
    onError(error) {
      console.error(error);

      toast({
        title: "Unexpected error happened",
        description:
          "Please check the browser developer console for more information",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <ActionInfo
        actionMetadataItem={actionMetadataItem}
        onRefreshUrl={onRefreshUrl}
      >
        <div>
          <div className="flex items-center">
            <div className="flex items-center grow space-x-2">
              <div>
                <IconByName
                  iconName={actionMetadataItem.action.icon || "alert"}
                  size={32}
                  fill="#64748B"
                />
              </div>
              <div>
                <div className="text-md font-medium">
                  {actionMetadataItem.action.name}
                </div>
                <div className="text-sm text-slate-500">
                  {actionMetadataItem.action.description}
                </div>
              </div>
            </div>
            <div className="p-2">
              <a
                href={actionMetadataItem.action.aboutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                title="Learn more about this action"
              >
                <InfoIcon size={20} color="#64748B" />
              </a>
            </div>
          </div>
          <button
            type="button"
            className={`p-2 border text-sm text-gray-800 rounded w-full mt-2`}
            style={{
              flex: "1 1 0px",
              // fixme: hover style
              backgroundColor: defaultTheme.buttonBg,
              borderColor: defaultTheme.buttonBorderColor,
              color: defaultTheme.buttonColor,
            }}
            onClick={() => {
              if (actionMetadataItem.status !== "success") {
                console.error(actionMetadataItem);

                toast({
                  title: "Invalid action metadata",
                  description: "Please check the console for more information",
                  variant: "destructive",
                });
                return;
              }

              if ("type" in actionMetadataItem.action) {
                console.error(actionMetadataItem);

                toast({
                  title: "Invalid action metadata",
                  description:
                    "You are probably trying to debug a composer action",
                  variant: "destructive",
                });

                return;
              }

              const url =
                actionMetadataItem.action.action.postUrl ||
                actionMetadataItem.url;

              if (postUrl === url) {
                castAction.refetch();
              } else {
                setPostUrl(url);
              }
            }}
          >
            Run
          </button>
        </div>
      </ActionInfo>

      {castAction.status === "success" && castAction.type === "frame" && (
        <FrameDebugger
          hasExamples={hasExamples}
          key={castAction.data.frameUrl}
          url={castAction.data.frameUrl}
          initialFrame={castAction.frame}
          protocol={{
            protocol: "farcaster",
            specification: "farcaster",
          }}
          mockHubContext={mockHubContext}
          setMockHubContext={setMockHubContext}
        />
      )}
    </>
  );
}
