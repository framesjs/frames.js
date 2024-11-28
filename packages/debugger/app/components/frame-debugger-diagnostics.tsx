import { Table, TableBody, TableCell, TableRow } from "@/components/table";
import {
  getFrameFlattened,
  getFrameV2Flattened,
  type ParsingReport,
} from "frames.js";
import { AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { useMemo } from "react";
import { ShortenedText } from "./shortened-text";
import type { DebuggerFrameStackItem } from "../hooks/useDebuggerFrameState";
import { cn } from "@/lib/utils";

type FrameDebuggerDiagnosticsProps = {
  stackItem: DebuggerFrameStackItem;
};

function isPropertyExperimental([key, value]: [string, string]) {
  // tx is experimental
  return false;
}

export function FrameDebuggerDiagnostics({
  stackItem,
}: FrameDebuggerDiagnosticsProps) {
  const properties = useMemo(() => {
    /** tuple of key and value */
    const validProperties: [string, string][] = [];
    /** tuple of key and error message */
    const invalidProperties: [string, ParsingReport[]][] = [];
    const visitedInvalidProperties: string[] = [];

    if (stackItem.status === "pending") {
      return { validProperties, invalidProperties, isValid: true };
    }

    if (stackItem.status === "requestError") {
      return { validProperties, invalidProperties, isValid: false };
    }

    if (stackItem.status === "message") {
      return { validProperties, invalidProperties, isValid: true };
    }

    if (stackItem.status === "doneRedirect") {
      return { validProperties, invalidProperties, isValid: true };
    }

    const result = stackItem.frameResult;

    // we need to check validation errors first because getFrame incorrectly return a value for a key even if it's invalid
    for (const [key, reports] of Object.entries(result.reports)) {
      invalidProperties.push([key, reports]);
      visitedInvalidProperties.push(key);
    }

    const flattenedFrame =
      result.specification === "farcaster_v2"
        ? getFrameV2Flattened(result.frame, {
            "frames.js:version":
              "frames.js:version" in result.frame &&
              typeof result.frame["frames.js:version"] === "string"
                ? result.frame["frames.js:version"]
                : undefined,
          })
        : getFrameFlattened(result.frame, {
            "frames.js:version":
              "frames.js:version" in result.frame &&
              typeof result.frame["frames.js:version"] === "string"
                ? result.frame["frames.js:version"]
                : undefined,
          });

    if (result.framesVersion) {
      validProperties.push(["frames.js:version", result.framesVersion]);
    }

    let hasExperimentalProperties = false;

    for (const [key, value] of Object.entries(flattenedFrame)) {
      hasExperimentalProperties =
        hasExperimentalProperties || isPropertyExperimental([key, value ?? ""]);
      // skip if the key is already set as invalid or value is undefined / null
      if (visitedInvalidProperties.includes(key) || value == null) {
        continue;
      }

      validProperties.push([key, value]);
    }

    return {
      validProperties,
      invalidProperties,
      isValid: invalidProperties.length === 0,
      hasExperimentalProperties,
    };
  }, [stackItem]);

  if (stackItem.status === "pending") {
    return null;
  }

  return (
    <Table>
      <TableBody>
        <TableRow>
          <TableCell>
            {stackItem.extra.speed > 5 ? (
              <XCircleIcon size={20} color="red" />
            ) : stackItem.extra.speed > 4 ? (
              <AlertTriangleIcon size={20} color="orange" />
            ) : (
              <CheckCircle2Icon size={20} color="green" />
            )}
          </TableCell>
          <TableCell>frame speed</TableCell>
          <TableCell className="text-slate-500">
            {stackItem.extra.speed > 5
              ? `Request took more than 5s (${stackItem.extra.speed} seconds). This may be normal: first request will take longer in development (as next.js builds), but in production, clients will timeout requests after 5s`
              : stackItem.extra.speed > 4
                ? `Warning: Request took more than 4s (${stackItem.extra.speed} seconds). Requests will fail at 5s. This may be normal: first request will take longer in development (as next.js builds), but in production, if there's variance here, requests could fail in production if over 5s`
                : `${stackItem.extra.speed} seconds`}
          </TableCell>
        </TableRow>
        {properties.validProperties.map(([propertyKey, value]) => {
          return (
            <TableRow key={`${propertyKey}-valid`}>
              <TableCell>
                {isPropertyExperimental([propertyKey, value]) ? (
                  <span className="whitespace-nowrap flex">
                    <div className="inline">
                      <CheckCircle2Icon size={20} color="orange" />
                    </div>
                    <div className="inline text-slate-500">*</div>
                  </span>
                ) : (
                  <CheckCircle2Icon size={20} color="green" />
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
                      <XCircleIcon size={20} color="red" />
                    ) : (
                      <AlertTriangleIcon size={20} color="orange" />
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
