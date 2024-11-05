import { Table, TableBody, TableCell, TableRow } from "@/components/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
  type FarcasterFrameContext,
  type FrameActionBodyPayload,
  defaultTheme,
} from "@frames.js/render";
import { ParsingReport } from "frames.js";
import {
  AlertTriangle,
  CheckCircle2,
  InfoIcon,
  RefreshCwIcon,
  XCircle,
} from "lucide-react";
import React, {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Button } from "../../@/components/ui/button";
import { FrameDebugger } from "./frame-debugger";
import IconByName from "./octicons";
import { MockHubActionContext } from "../utils/mock-hub-utils";
import { useFrame } from "@frames.js/render/use-frame";
import { WithTooltip } from "./with-tooltip";
import { useToast } from "@/components/ui/use-toast";
import type { CastActionDefinitionResponse } from "../frames/route";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FarcasterSigner } from "@frames.js/render/identity/farcaster";
import { ComposerActionDebugger } from "./composer-action-debugger";

type FrameDebuggerFramePropertiesTableRowsProps = {
  actionMetadataItem: CastActionDefinitionResponse;
};

function isPropertyExperimental([key, value]: [string, string]) {
  // tx is experimental
  return false;
}

function ActionDebuggerPropertiesTableRow({
  actionMetadataItem,
}: FrameDebuggerFramePropertiesTableRowsProps) {
  const properties = useMemo(() => {
    /** tuple of key and value */
    const validProperties: [string, string][] = [];
    /** tuple of key and error message */
    const invalidProperties: [string, ParsingReport[]][] = [];
    const visitedInvalidProperties: string[] = [];
    const result = actionMetadataItem;

    // we need to check validation errors first because getFrame incorrectly return a value for a key even if it's invalid
    for (const [key, reports] of Object.entries(result.reports)) {
      invalidProperties.push([key, reports]);
      visitedInvalidProperties.push(key);
    }

    for (const [key, value] of Object.entries(result.action)) {
      if (visitedInvalidProperties.includes(key) || value == null) {
        continue;
      }

      if (typeof value === "object") {
        validProperties.push([key, JSON.stringify(value)]);
      } else {
        validProperties.push([key, value]);
      }
    }

    return {
      validProperties,
      invalidProperties,
      isValid: invalidProperties.length === 0,
      hasExperimentalProperties: false,
    };
  }, [actionMetadataItem]);

  return (
    <Table>
      <TableBody>
        {properties.validProperties.map(([propertyKey, value]) => {
          return (
            <TableRow key={`${propertyKey}-valid`}>
              <TableCell>
                {isPropertyExperimental([propertyKey, value]) ? (
                  <span className="whitespace-nowrap flex">
                    <div className="inline">
                      <CheckCircle2 size={20} color="orange" />
                    </div>
                    <div className="inline text-slate-500">*</div>
                  </span>
                ) : (
                  <CheckCircle2 size={20} color="green" />
                )}
              </TableCell>
              <TableCell>{propertyKey}</TableCell>
              <TableCell className="text-slate-500">
                <ShortenedText text={value} maxLength={30} />
              </TableCell>
            </TableRow>
          );
        })}
        {properties.invalidProperties.flatMap(
          ([propertyKey, errorMessages]) => {
            return errorMessages.map((errorMessage, i) => {
              return (
                <TableRow key={`${propertyKey}-${i}-invalid`}>
                  <TableCell>
                    {errorMessage.level === "error" ? (
                      <XCircle size={20} color="red" />
                    ) : (
                      <AlertTriangle size={20} color="orange" />
                    )}
                  </TableCell>
                  <TableCell>{propertyKey}</TableCell>
                  <TableCell className="text-slate-500">
                    <p
                      className={cn(
                        "font-bold",
                        errorMessage.level === "error"
                          ? "text-red-500"
                          : "text-orange-500"
                      )}
                    >
                      {errorMessage.message}
                    </p>
                  </TableCell>
                </TableRow>
              );
            });
          }
        )}
        {properties.hasExperimentalProperties && (
          <TableRow>
            <TableCell colSpan={3} className="text-slate-500">
              *This property is experimental and may not have been adopted in
              clients yet
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function ShortenedText({
  maxLength,
  text,
}: {
  maxLength: number;
  text: string;
}) {
  if (text.length < maxLength) return text;

  return (
    <HoverCard>
      <HoverCardTrigger>{text.slice(0, maxLength - 3)}...</HoverCardTrigger>
      <HoverCardContent className="break-words">{text}</HoverCardContent>
    </HoverCard>
  );
}

type ActionDebuggerProps = {
  actionMetadataItem: CastActionDefinitionResponse;
  farcasterFrameConfig: Parameters<
    typeof useFrame<
      FarcasterSigner | null,
      FrameActionBodyPayload,
      FarcasterFrameContext
    >
  >[0];
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
      farcasterFrameConfig,
      refreshUrl,
      mockHubContext,
      setMockHubContext,
      hasExamples,
    },
    ref
  ) => {
    const { toast } = useToast();
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

    const actionFrameState = useFrame({
      ...farcasterFrameConfig,
    });
    const [castActionDefinition, setCastActionDefinition] = useState<Exclude<
      CastActionDefinitionResponse,
      { status: "failure" }
    > | null>(null);

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
            <ActionInfo
              actionMetadataItem={actionMetadataItem}
              onRefreshUrl={() => refreshUrl()}
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
                        description:
                          "Please check the console for more information",
                        variant: "destructive",
                      });
                      return;
                    }

                    setCastActionDefinition(actionMetadataItem);

                    Promise.resolve(
                      actionFrameState.onCastActionButtonPress({
                        castAction: {
                          ...actionMetadataItem.action,
                          url: actionMetadataItem.url,
                        },
                        // clear stack, this removes first item that will appear in the debugger
                        clearStack: true,
                      })
                    ).catch((e: unknown) => {
                      // eslint-disable-next-line no-console -- provide feedback to the user
                      console.error("trolo", e);
                    });
                  }}
                >
                  Run
                </button>
              </div>
            </ActionInfo>

            {!!castActionDefinition &&
              !("type" in castActionDefinition.action) && (
                <div>
                  <div className="border-t mx-4"></div>
                  <FrameDebugger
                    hasExamples={hasExamples}
                    frameState={actionFrameState}
                    url={castActionDefinition.url}
                    mockHubContext={mockHubContext}
                    setMockHubContext={setMockHubContext}
                    specification={"farcaster"}
                  ></FrameDebugger>
                </div>
              )}
          </TabsContent>
          <TabsContent value="composer-action">
            <ActionInfo
              actionMetadataItem={actionMetadataItem}
              onRefreshUrl={() => refreshUrl()}
            >
              <ComposerActionDebugger
                actionMetadata={actionMetadataItem.action}
                url={actionMetadataItem.url}
                onToggleToCastActionDebugger={() => {
                  setActiveTab("cast-action");
                }}
              />
            </ActionInfo>
          </TabsContent>
        </Tabs>
      </>
    );
  }
);

ActionDebugger.displayName = "ActionDebugger";

type ActionInfoProps = {
  actionMetadataItem: CastActionDefinitionResponse;
  children: React.ReactNode;
  onRefreshUrl: () => void;
};

function ActionInfo({
  actionMetadataItem,
  children,
  onRefreshUrl,
}: ActionInfoProps) {
  return (
    <div className="flex flex-row items-start p-4 gap-4 bg-slate-50 max-w-full w-full">
      <div className="flex flex-col gap-4 w-[300px] min-w-[300px]">
        <div className="flex flex-row gap-2">
          <WithTooltip tooltip={<p>Reload URL</p>}>
            <Button
              className="flex flex-row gap-3 items-center shadow-sm border"
              variant={"outline"}
              onClick={() => {
                onRefreshUrl();
              }}
            >
              <RefreshCwIcon size={20} />
            </Button>
          </WithTooltip>
        </div>
      </div>
      <div className="flex flex-col gap-4 w-[500px] min-w-[500px]">
        <Card>
          <CardContent className="p-2">{children}</CardContent>
        </Card>
      </div>
      <div className="flex flex-row gap-4 w-full">
        <div className="h-full min-w-0 w-full">
          <Card>
            <CardContent className="p-0 px-2">
              <ActionDebuggerPropertiesTableRow
                actionMetadataItem={actionMetadataItem}
              ></ActionDebuggerPropertiesTableRow>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
