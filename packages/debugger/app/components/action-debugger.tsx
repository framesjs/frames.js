import React, {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { MockHubActionContext } from "../utils/mock-hub-utils";
import type { CastActionDefinitionResponse } from "../frames/route";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComposerActionDebugger } from "./composer-action-debugger";
import { CastActionDebugger } from "./cast-action-debugger";
import { useProtocolSelector } from "../providers/ProtocolSelectorProvider";

type ActionDebuggerProps = {
  actionMetadataItem: CastActionDefinitionResponse;
  refreshUrl: (arg0?: string) => void;
  mockHubContext?: Partial<MockHubActionContext>;
  setMockHubContext?: Dispatch<SetStateAction<Partial<MockHubActionContext>>>;
  hasExamples: boolean;
};

type TabValues = "composer-action" | "cast-action";

export type ActionDebuggerRef = {
  switchTo(tab: TabValues): void;
};

export const ActionDebugger = React.forwardRef<
  ActionDebuggerRef,
  ActionDebuggerProps
>(
  (
    {
      actionMetadataItem,
      refreshUrl,
      mockHubContext,
      setMockHubContext,
      hasExamples,
    },
    ref
  ) => {
    const protocolSelector = useProtocolSelector();
    const [activeTab, setActiveTab] = useState<TabValues>(
      "type" in actionMetadataItem.action &&
        actionMetadataItem.action.type === "composer"
        ? "composer-action"
        : "cast-action"
    );
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
      if (copySuccess) {
        setTimeout(() => {
          setCopySuccess(false);
        }, 1000);
      }
    }, [copySuccess, setCopySuccess]);

    useImperativeHandle(
      ref,
      () => {
        return {
          switchTo(tab) {
            setActiveTab(tab);
          },
        };
      },
      []
    );

    return (
      <>
        <Tabs
          className="flex flex-col mt-2"
          onValueChange={(tab) => setActiveTab(tab as TabValues)}
          value={activeTab}
        >
          <TabsList className="mx-auto">
            <TabsTrigger className="text-base" value="cast-action">
              Cast action
            </TabsTrigger>
            <TabsTrigger className="text-base" value="composer-action">
              Composer action
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cast-action">
            <CastActionDebugger
              actionMetadataItem={actionMetadataItem}
              hasExamples={hasExamples}
              onRefreshUrl={() => refreshUrl()}
              mockHubContext={mockHubContext}
              setMockHubContext={setMockHubContext}
            />
          </TabsContent>
          <TabsContent value="composer-action">
            <ComposerActionDebugger
              actionMetadata={actionMetadataItem.action}
              actionMetadataItem={actionMetadataItem}
              url={actionMetadataItem.url}
              onRefreshUrl={() => refreshUrl()}
              onToggleToCastActionDebugger={() => {
                setActiveTab("cast-action");
              }}
            />
          </TabsContent>
        </Tabs>
      </>
    );
  }
);

ActionDebugger.displayName = "ActionDebugger";
