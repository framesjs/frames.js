import { JSONTree } from "react-json-tree";
import { AlertTriangleIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/table";
import type { DebuggerFrameStackItem } from "../hooks/useDebuggerFrameState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  ParseResultFramesV2FrameManifestSuccess,
  ParseResultFramesV2FrameManifestFailure,
} from "frames.js/frame-parsers";
import { cn } from "@/lib/utils";

type FrameDebuggerFarcasterManifestDetailsProps = {
  frameStackItem: DebuggerFrameStackItem;
};

export function FrameDebuggerFarcasterManifestDetails({
  frameStackItem,
}: FrameDebuggerFarcasterManifestDetailsProps) {
  if (frameStackItem.status !== "done") {
    return null;
  }

  return (
    <>
      {frameStackItem.extra.parseResult.farcaster_v2.manifest?.status ===
      "success" ? (
        <FrameDebuggerFarcasterManifestDetailsComplete
          manifestParseResult={
            frameStackItem.extra.parseResult.farcaster_v2.manifest
          }
        />
      ) : (
        <FrameDebuggerFarcasterManifestDetailsPartial
          manifestParseResult={
            frameStackItem.extra.parseResult.farcaster_v2.manifest
          }
        />
      )}
    </>
  );
}

type FrameDebuggerFarcasterManifestDetailsCompleteProps = {
  manifestParseResult: ParseResultFramesV2FrameManifestSuccess;
};

function FrameDebuggerFarcasterManifestDetailsComplete({
  manifestParseResult,
}: FrameDebuggerFarcasterManifestDetailsCompleteProps) {
  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <CheckCircleIcon className="h-4 w-4" />
        <AlertTitle>Manifest is valid!</AlertTitle>
      </Alert>

      <div className="flex flex-col gap-2">
        <h3 className="text-muted-foreground font-semibold text-sm">
          Metadata JSON
        </h3>
        <JSONTree
          data={manifestParseResult.manifest}
          invertTheme
          theme="default"
          shouldExpandNodeInitially={() => true}
        />
      </div>
    </div>
  );
}

type FrameDebuggerFarcasterManifestDetailsPartialProps = {
  manifestParseResult: ParseResultFramesV2FrameManifestFailure | undefined;
};

function FrameDebuggerFarcasterManifestDetailsPartial({
  manifestParseResult,
}: FrameDebuggerFarcasterManifestDetailsPartialProps) {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertTitle>Manifest is invalid!</AlertTitle>
        {manifestParseResult ? (
          <AlertDescription>
            There were errors parsing the manifest, see below for details.
          </AlertDescription>
        ) : (
          <AlertDescription>
            Manifest parsing result is missing
          </AlertDescription>
        )}
      </Alert>

      {manifestParseResult?.manifest && (
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground font-semibold text-sm">
            Manifest JSON
          </h3>
          <JSONTree
            data={manifestParseResult.manifest}
            invertTheme
            theme="default"
            shouldExpandNodeInitially={() => true}
          />
        </div>
      )}

      {manifestParseResult?.reports && (
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground font-semibold text-sm">
            Reports
          </h3>
          <Table>
            <TableBody>
              {Object.entries(manifestParseResult.reports).flatMap(
                ([key, value]) => {
                  return value.map((report, index) => {
                    return (
                      <TableRow key={`${key}-${index}-invalid`}>
                        <TableCell>
                          {report.level === "error" ? (
                            <XCircleIcon size={20} color="red" />
                          ) : (
                            <AlertTriangleIcon size={20} color="orange" />
                          )}
                        </TableCell>
                        <TableCell>{key}</TableCell>
                        <TableCell className="text-slate-500">
                          <p
                            className={cn(
                              "font-bold",
                              report.level === "error"
                                ? "text-red-500"
                                : "text-orange-500"
                            )}
                          >
                            {report.message}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  });
                }
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
