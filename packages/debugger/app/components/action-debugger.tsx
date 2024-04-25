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

type FrameDebuggerFramePropertiesTableRowsProps = {
  actionMetadataItem: ParseActionResult;
};

function paramsToObject(entries: IterableIterator<[string, string]>): object {
  const result: Record<string, any> = {};
  for (const [key, value] of entries) {
    // each 'entry' is a [key, value] tupple
    if (value.startsWith("{")) {
      try {
        result[key] = JSON.parse(value);
        continue;
      } catch (err) {}
    }
    result[key] = value;
  }
  return result;
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
    for (const [key, parseResults] of Object.entries(result.reports)) {
      // Group errors by level
      parseResults.forEach((result) => {
        if (result.level === "valid") {
          validProperties.push([key, result.message]);
        } else {
          invalidProperties.push([key, parseResults]);
        }
      });
    }

    const invalidKeys = invalidProperties.reduce(
      (acc, [key]) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );

    return {
      validProperties: validProperties.filter(([key]) => !invalidKeys[key]),
      invalidProperties,
      isValid: invalidProperties.length === 0,
      hasExperimentalProperties: false,
    };
  }, [actionMetadataItem]);

  return (
    <>
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
      {properties.invalidProperties.flatMap(([propertyKey, errorMessages]) => {
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
      })}
      {properties.hasExperimentalProperties && (
        <TableRow>
          <TableCell colSpan={3} className="text-slate-500">
            *This property is experimental and may not have been adopted in
            clients yet
          </TableCell>
        </TableRow>
      )}
    </>
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

  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const actionFrameState = useActionFrame(farcasterFrameConfig);

  const [showFrameDebugger, setShowFrameDebugger] = useState(false);

  return (
    <>
      <div className="flex flex-row items-start p-4 gap-4 bg-slate-50 max-w-full w-full h-full">
        <div className="flex flex-col gap-4 w-[300px] min-w-[300px]">
          <div className="flex flex-row gap-2">
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
                  disabled={isLoading}
                  className={`p-2 ${
                    isLoading ? "bg-gray-100" : ""
                  } border text-sm text-gray-800 rounded w-full mt-2`}
                  style={{
                    flex: "1 1 0px",
                    // fixme: hover style
                    backgroundColor: defaultTheme.buttonBg,
                    borderColor: defaultTheme.buttonBorderColor,
                    color: defaultTheme.buttonColor,
                    cursor: isLoading ? undefined : "pointer",
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
                        1
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
              <CardContent className="p-0">
                <div className="px-2">
                  <Table>
                    <TableBody>
                      <ActionDebuggerPropertiesTableRow
                        actionMetadataItem={actionMetadataItem}
                      ></ActionDebuggerPropertiesTableRow>
                    </TableBody>
                  </Table>
                </div>
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
