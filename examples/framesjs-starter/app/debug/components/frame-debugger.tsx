import { getFrameHtmlHead, getFrameFlattened } from "frames.js";
import { useEffect, useMemo, useState } from "react";
import React from "react";
import { FrameState } from "frames.js/render";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { LoaderIcon } from "lucide-react";

type FrameDebuggerFramePropertiesTableRowsProps = {
  stackItem: FrameState["framesStack"][number];
};

function FrameDebuggerFramePropertiesTableRow({
  stackItem,
}: FrameDebuggerFramePropertiesTableRowsProps) {
  const properties = useMemo(() => {
    /** tuple of key and value */
    const validProperties: [string, string][] = [];
    /** tuple of key and error message */
    const invalidProperties: [string, string[]][] = [];
    const visitedInvalidProperties: string[] = [];

    if ("requestError" in stackItem) {
      return { validProperties, invalidProperties, isValid: false };
    }

    // we need to check validation errors first because getFrame incorrectly return a value for a key even if it's invalid
    if (stackItem.frameValidationErrors) {
      for (const [key, errors] of Object.entries(
        stackItem.frameValidationErrors
      )) {
        invalidProperties.push([key, errors]);
        visitedInvalidProperties.push(key);
      }
    }

    const flattenedFrame = getFrameFlattened(stackItem.frame);

    for (const [key, value] of Object.entries(flattenedFrame)) {
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
    };
  }, [stackItem]);

  return (
    <>
      {properties.validProperties.map(([propertyKey, value]) => {
        return (
          <TableRow key={`${propertyKey}-valid`}>
            <TableCell>🟢</TableCell>
            <TableCell>{propertyKey}</TableCell>
            <TableCell className="text-slate-500">{value}</TableCell>
          </TableRow>
        );
      })}
      {properties.invalidProperties.map(([propertyKey, errorMessages]) => {
        return (
          <TableRow key={`${propertyKey}-invalid`}>
            <TableCell>🔴</TableCell>
            <TableCell>{propertyKey}</TableCell>
            <TableCell className="text-slate-500">
              <p className="font-bold text-red-800">
                {errorMessages.join(", ")}
              </p>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

export function FrameDebugger({
  children,
  url,
  frameState,
}: {
  frameState: FrameState;
  children: React.ReactElement<any>;
  url: string;
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

  function onValueChange(nextValue: string[]) {
    setOpenAccordions(nextValue);
  }
  useEffect(() => {
    if (!frameState.isLoading) {
      // make sure the first frame is open
      if (
        !openAccordions.includes(
          String(frameState.framesStack[0]?.timestamp.getTime())
        )
      )
        setOpenAccordions((v) => [
          ...v,
          String(frameState.framesStack[0]?.timestamp.getTime()),
        ]);
    }
  }, [frameState.isLoading]);

  return (
    <div className="flex flex-col items-start">
      <div className="p-4 flex flex-col gap-4 w-[500px] min-w-[500px]">
        <span className="font-bold">Debugging frame at: {url}</span>
        {children}
        {frameState.isLoading && !frameState.frame ? "Loading..." : null}
      </div>
      <div className="flex flex-row gap-4 w-full">
        <div className="p-4 h-full min-w-0 w-full">
          <h3 className="font-bold">Frames</h3>
          {frameState.isLoading ? (
            <div
              className="flex flex-row gap-2 py-2"
              // className={
              //   "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180"
              // }
            >
              <LoaderIcon className="animate-spin" />
              Fetching frame #{frameState.framesStack.length + 1}...
            </div>
          ) : null}
          <Accordion
            type="multiple"
            value={openAccordions}
            onValueChange={onValueChange}
          >
            {frameState.framesStack.map((frameStackItem, i) => {
              return (
                <AccordionItem
                  value={String(frameStackItem.timestamp.getTime())}
                  key={String(frameStackItem.timestamp.getTime())}
                >
                  <AccordionTrigger className="ml-2">
                    {!("requestError" in frameStackItem) &&
                    frameStackItem.isValid
                      ? "🟢"
                      : "🔴"}{" "}
                    Frame #{frameState.framesStack.length - i}{" "}
                    {i === 0 ? (
                      <span className="ml-1 bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300">
                        {" "}
                        Current Frame
                      </span>
                    ) : (
                      ""
                    )}
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            {"requestError" in frameStackItem ? "🔴" : "🟢"}
                          </TableCell>
                          <TableCell>frame fetched from</TableCell>
                          <TableCell className="text-slate-500">
                            <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300">
                              {frameStackItem.timestamp.toLocaleTimeString()}{" "}
                            </span>
                            <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300">
                              {frameStackItem.method}
                            </span>{" "}
                            {frameStackItem.url}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            {frameStackItem.speed > 5
                              ? "🔴"
                              : frameStackItem.speed > 4
                                ? "🟠"
                                : "🟢"}
                          </TableCell>
                          <TableCell>frame speed</TableCell>
                          <TableCell className="text-slate-500">
                            {frameStackItem.speed > 5
                              ? `Request took more than 5s (${frameStackItem.speed} seconds). This may be normal: first request will take longer in development (as next.js builds), but in production, clients will timeout requests after 5s`
                              : frameStackItem.speed > 4
                                ? `Warning: Request took more than 4s (${frameStackItem.speed} seconds). Requests will fail at 5s. This may be normal: first request will take longer in development (as next.js builds), but in production, if there's variance here, requests could fail in production if over 5s`
                                : `${frameStackItem.speed} seconds`}
                          </TableCell>
                        </TableRow>
                        <FrameDebuggerFramePropertiesTableRow
                          stackItem={frameStackItem}
                        ></FrameDebuggerFramePropertiesTableRow>
                      </TableBody>
                    </Table>
                    <a
                      target="_blank"
                      className="underline text-slate-400 mt-2 block"
                      href="https://docs.farcaster.xyz/learn/what-is-farcaster/frames"
                    >
                      ↗ Farcaster Frames Spec
                    </a>
                    <div className="bg-slate-100 p-4 flex-1">
                      <h3 className="font-bold">frames.js Frame object</h3>
                      <pre
                        id="json"
                        className="font-mono text-xs"
                        style={{
                          padding: "10px",
                          borderRadius: "4px",
                        }}
                      >
                        {JSON.stringify(
                          "frame" in frameStackItem
                            ? frameStackItem.frame
                            : undefined,
                          null,
                          2
                        )}
                      </pre>
                      {"frame" in frameStackItem ? (
                        <div className="py-4 flex-1">
                          <span className="font-bold mr-2">html tags</span>
                          <button
                            className="underline"
                            onClick={() => {
                              // Copy the text inside the text field
                              navigator.clipboard.writeText(
                                getFrameHtmlHead(frameStackItem.frame)
                              );
                              setCopySuccess(true);
                            }}
                          >
                            {copySuccess
                              ? "✔︎ copied to clipboard"
                              : "copy html tags"}
                          </button>
                          <pre
                            id="html"
                            className="text-xs"
                            style={{
                              padding: "10px",
                              borderRadius: "4px",
                            }}
                          >
                            {getFrameHtmlHead(frameStackItem.frame)
                              .split("<meta")
                              .filter((t) => !!t)
                              // hacky...
                              .flatMap((el, i) => [
                                <span key={i}>{`<meta${el}`}</span>,
                                <br key={`br_${i}`} />,
                              ])}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
