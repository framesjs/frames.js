import { Frame, frameErrorKeys, getFrame, getFrameHtmlHead } from "frames.js";
import { useEffect, useState } from "react";
import { FrameRender } from "./frame-render";
import React from "react";

export function FrameDebugger({
  children,
  frameData,
  url,
  framePerformanceInSeconds,
}: {
  children: React.ReactElement<typeof FrameRender>;
  frameData: ReturnType<typeof getFrame> | undefined;
  url: string;
  framePerformanceInSeconds: number | null;
}) {
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (copySuccess) {
      setTimeout(() => {
        setCopySuccess(false);
      }, 1000);
    }
  }, [copySuccess, setCopySuccess]);

  return (
    <div className="flex flex-col gap-4 items-start">
      <div className="flex flex-row gap-4">
        <div className="p-4 flex flex-col gap-4">
          <span className="font-bold">Debugging frame at: {url}</span>
          {children}
        </div>
        <div className="p-4 h-full">
          <h3 className="font-bold">Frame Validations</h3>
          <div className="min-w-[400px]">
            {framePerformanceInSeconds ? (
              <div
                style={{ display: "flex", flexDirection: "row", gap: "8px" }}
              >
                <div>
                  {" "}
                  {framePerformanceInSeconds > 5
                    ? "🔴"
                    : framePerformanceInSeconds > 4
                      ? "🟠"
                      : "🟢"}
                </div>
                <div className="text-slate-600">{"frame speed (seconds)"}</div>

                <div className="font-bold text-red-800">
                  {framePerformanceInSeconds > 5
                    ? `Request took more than 5s (${framePerformanceInSeconds} seconds). This may be normal: first request will take longer in development (as next.js builds), but in production, clients will timeout requests after 5s`
                    : framePerformanceInSeconds > 4
                      ? `Warning: Request took more than 4s (${framePerformanceInSeconds} seconds). Requests will fail at 5s. This may be normal: first request will take longer in development (as next.js builds), but in production, if there's variance here, requests could fail in production if over 5s`
                      : `${framePerformanceInSeconds} seconds`}
                </div>
              </div>
            ) : null}
            {frameErrorKeys.map((key) => (
              <div
                style={{ display: "flex", flexDirection: "row", gap: "8px" }}
                key={key}
              >
                <div>
                  {frameData?.errors?.[key] || !frameData?.frame ? "🔴" : "🟢"}
                </div>
                <div className="text-slate-600">{key}</div>
                <div className="font-bold text-red-800">
                  {" "}
                  {frameData?.errors?.[key]?.join(",")}
                </div>
              </div>
            ))}
            <a
              target="_blank"
              className="underline text-slate-400 mt-2 block"
              href="https://docs.farcaster.xyz/learn/what-is-farcaster/frames"
            >
              ↗ Farcaster Frames Spec
            </a>
          </div>
        </div>
      </div>
      <div className="bg-slate-100 p-4 flex-1	">
        <h3 className="font-bold">frames.js Frame object</h3>
        <pre
          id="json"
          className="font-mono text-sm"
          style={{
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          {JSON.stringify(frameData?.frame, null, 2)}
        </pre>
        {frameData?.frame ? (
          <div className="py-4 flex-1">
            <span className="font-bold mr-2">html tags</span>
            <button
              className="underline"
              onClick={() => {
                // Copy the text inside the text field
                navigator.clipboard.writeText(
                  getFrameHtmlHead(frameData?.frame!)
                );
                setCopySuccess(true);
              }}
            >
              {copySuccess ? "✔︎ copied to clipboard" : "copy html tags"}
            </button>
            <pre
              id="html"
              style={{
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              {getFrameHtmlHead(frameData?.frame)
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
    </div>
  );
}
