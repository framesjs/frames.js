import { useMemo } from "react";
import type { CastActionDefinitionResponse } from "../frames/route";
import type { ParsingReport } from "frames.js";
import { Table, TableBody, TableCell, TableRow } from "@/components/table";
import { AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShortenedText } from "./shortened-text";

function isPropertyExperimental([key, value]: [string, string]) {
  return false;
}

type ActionDebuggerPropertiesTableProps = {
  actionMetadataItem: CastActionDefinitionResponse;
};

export function ActionDebuggerPropertiesTable({
  actionMetadataItem,
}: ActionDebuggerPropertiesTableProps) {
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
