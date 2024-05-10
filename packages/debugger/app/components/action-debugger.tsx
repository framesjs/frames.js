import { Table, TableBody, TableCell, TableRow } from "@/components/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
  FarcasterFrameContext,
  FarcasterSigner,
  FrameActionBodyPayload,
  FrameRequest,
  FrameStackMessage,
  FrameStackPending,
  FrameStackRequestError,
  GetFrameResult,
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
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Button } from "../../@/components/ui/button";
import { ParseActionResult } from "../actions/types";
import { useAction as useActionFrame } from "../actions/use-action";
import { FrameDebugger } from "./frame-debugger";
import IconByName from "./octicons";
import { MockHubActionContext } from "../utils/mock-hub-utils";
import { useFrame } from "@frames.js/render/use-frame";
import { WithTooltip } from "./with-tooltip";

type FrameDebuggerFramePropertiesTableRowsProps = {
  actionMetadataItem: ParseActionResult;
};

function computeDurationInSeconds(start: Date, end: Date): number {
  return Number(((end.getTime() - start.getTime()) / 1000).toFixed(2));
}

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

export function ActionDebugger({
  actionMetadataItem,
  farcasterFrameConfig,
  refreshUrl,
  mockHubContext,
  setMockHubContext,
}: {
  actionMetadataItem: ParseActionResult;
  farcasterFrameConfig: Parameters<
    typeof useActionFrame<
      FarcasterSigner,
      FrameActionBodyPayload,
      FarcasterFrameContext
    >
  >[0];
  refreshUrl: (arg0?: string) => void;
  mockHubContext?: Partial<MockHubActionContext>;
  setMockHubContext?: Dispatch<SetStateAction<Partial<MockHubActionContext>>>;
}) {
  const [copySuccess, setCopySuccess] = useState(false);
  useEffect(() => {
    if (copySuccess) {
      setTimeout(() => {
        setCopySuccess(false);
      }, 1000);
    }
  }, [copySuccess, setCopySuccess]);

  const actionFrameState = useFrame(farcasterFrameConfig);

  async function fetchFrame(
    frameRequest: FrameRequest,
    shouldClear = false
  ): Promise<void> {
    const startTime = new Date();

    if (shouldClear) {
      // this clears initial frame since that is loading from SSR since we aren't able to finish it.
      // not an ideal solution
      actionFrameState.dispatchFrameStack({ action: "CLEAR" });
    }

    if (frameRequest.method === "GET") {
      // We don't handle GET requests when debugging actions
    } else {
      const searchParams = new URLSearchParams(
        frameRequest.request.searchParams
      );

      searchParams.set("specification", "farcaster");

      const frameStackPendingItem: FrameStackPending = {
        method: "POST" as const,
        request: {
          searchParams,
          body: frameRequest.request.body,
        },
        timestamp: startTime,
        url: frameRequest.url,
        status: "pending",
        sourceFrame: frameRequest.sourceFrame,
      };

      actionFrameState.dispatchFrameStack({
        action: "LOAD",
        item: frameStackPendingItem,
      });

      const proxiedUrl = `/frames?${frameStackPendingItem.request.searchParams.toString()}`;

      let response;
      let endTime = new Date();

      try {
        response = await fetch(proxiedUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...farcasterFrameConfig.extraButtonRequestPayload,
            ...frameRequest.request.body,
          }),
        }).finally(() => {
          endTime = new Date();
        });

        console.log("response", response.status);

        if (!response.ok) {
          if (response.status >= 500)
            throw new Error(`Failed to fetch frame: ${response.statusText}`);
        }

        const responseData = (await response.json()) as
          | GetFrameResult
          | { location: string }
          | { message: string }
          | { type: "frame"; frameUrl: string };

        console.log("responseData", responseData);

        if ("location" in responseData) {
          const location = responseData.location;

          if (window.confirm(`You are about to be redirected to ${location}`)) {
            window.open(location, "_blank")?.focus();
          }

          return;
        } else if ("message" in responseData) {
          const stackItem: FrameStackMessage = {
            ...frameStackPendingItem,
            responseStatus: response.status,
            speed: computeDurationInSeconds(startTime, endTime),
            status: "message",
            type: "info",
            message: responseData.message,
          };

          actionFrameState.dispatchFrameStack({
            action: "DONE",
            pendingItem: frameStackPendingItem,
            item: stackItem,
          });
          return;
        } else if ("frameUrl" in responseData) {
          const stackItem: FrameStackMessage = {
            ...frameStackPendingItem,
            responseStatus: response.status,
            speed: computeDurationInSeconds(startTime, endTime),
            status: "message",
            type: "info",
            message: "Loading frame from frameUrl.",
          };

          actionFrameState.dispatchFrameStack({
            action: "DONE",
            pendingItem: frameStackPendingItem,
            item: stackItem,
          });

          actionFrameState.onButtonPress(
            { image: "", buttons: [], version: "vNext" },
            {
              action: "post",
              label: "action",
              target: responseData.frameUrl,
            },
            1
          );

          return;
        }

        actionFrameState.dispatchFrameStack({
          action: "DONE",
          pendingItem: frameStackPendingItem,
          item: {
            ...frameStackPendingItem,
            frame: responseData,
            status: "done",
            speed: computeDurationInSeconds(startTime, endTime),
            responseStatus: response.status,
          },
        });
      } catch (err) {
        const stackItem: FrameStackRequestError = {
          ...frameStackPendingItem,
          responseStatus: response?.status ?? 500,
          requestError: err,
          speed: computeDurationInSeconds(startTime, endTime),
          status: "requestError",
        };

        actionFrameState.dispatchFrameStack({
          action: "REQUEST_ERROR",
          pendingItem: frameStackPendingItem,
          item: stackItem,
        });

        console.error(err);
      }
    }
  }

  const [showFrameDebugger, setShowFrameDebugger] = useState(false);

  return (
    <>
      <div className="flex flex-row items-start p-4 gap-4 bg-slate-50 max-w-full w-full">
        <div className="flex flex-col gap-4 w-[300px] min-w-[300px]">
          <div className="flex flex-row gap-2">
            <WithTooltip tooltip={<p>Reload URL</p>}>
              <Button
                className="flex flex-row gap-3 items-center shadow-sm border"
                variant={"outline"}
                onClick={() => {
                  // TODO: loading indicators
                  refreshUrl();
                }}
              >
                <RefreshCwIcon size={20} />
              </Button>
            </WithTooltip>
          </div>
        </div>
        <div className="flex flex-col gap-4 w-[500px] min-w-[500px]">
          <Card>
            <CardContent className="p-2">
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
                    setShowFrameDebugger(true);
                    Promise.resolve(
                      actionFrameState.onButtonPress(
                        { image: "", buttons: [], version: "vNext" },
                        {
                          action: "post",
                          label: "action",
                          target: actionMetadataItem.action.url,
                        },
                        1,
                        fetchFrame
                      )
                    ).catch((e: unknown) => {
                      // eslint-disable-next-line no-console -- provide feedback to the user
                      console.error(e);
                    });
                  }}
                >
                  Run
                </button>
              </div>
            </CardContent>
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

      {showFrameDebugger && (
        <div>
          <div className="border-t mx-4"></div>
          {/* <pre>{JSON.stringify(actionFrameState.frame, null, 2)}</pre> */}
          <FrameDebugger
            frameState={actionFrameState}
            url={actionMetadataItem.action.url ?? ""}
            mockHubContext={mockHubContext}
            setMockHubContext={setMockHubContext}
            specification={"farcaster"}
          ></FrameDebugger>
        </div>
      )}
    </>
  );
}
