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
    <div>
      {children}
      <hr />
      <h1>Debugging Frame on url: {url}</h1>
      <p>
        <a
          target="_blank"
          href="https://docs.farcaster.xyz/learn/what-is-farcaster/frames"
        >
          Farcaster Frames Spec
        </a>
      </p>
      <div>
        <h3>Frame Validations</h3>
        <div>
          {framePerformanceInSeconds ? (
            <div
              style={{ display: "flex", flexDirection: "row", gap: "8px" }}
              key={"timing"}
            >
              <div>{"frame speed (seconds)"}</div>
              <div>
                {" "}
                {framePerformanceInSeconds > 5
                  ? "🔴"
                  : framePerformanceInSeconds > 3
                    ? "🟠"
                    : "🟢"}
              </div>
              <div>
                {framePerformanceInSeconds > 5
                  ? `Request took more than 5s (${framePerformanceInSeconds} seconds). The first time will take longer in development (as next.js builds), but in production, clients will timeout requests after 5s`
                  : framePerformanceInSeconds > 3
                    ? `Request took more than 3s (${framePerformanceInSeconds} seconds).The first time will take longer in development (as next.js builds), but in production, if there's variance here, requests could fail in production if over 5s - for example europe to america can already add 300ms latency`
                    : `${framePerformanceInSeconds} seconds`}
              </div>
            </div>
          ) : null}
          {frameErrorKeys.map((key) => (
            <div
              style={{ display: "flex", flexDirection: "row", gap: "8px" }}
              key={key}
            >
              <div>{key}</div>
              <div> {frameData?.errors?.[key] ? "🔴" : "🟢"}</div>
              <div>{frameData?.errors?.[key]?.join(",")}</div>
            </div>
          ))}
        </div>
      </div>
      <h3>frames.js `Frame` object</h3>
      <pre
        id="json"
        style={{
          background: "#2D2B52",
          color: "white",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        {JSON.stringify(frameData?.frame, null, 2)}
      </pre>
      {frameData?.frame ? (
        <div>
          <h3>html tags</h3>
          <button
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
              background: "#2D2B52",
              color: "white",
              padding: "10px",
              borderRadius: "4px",
            }}
          >
            {getFrameHtmlHead(frameData?.frame)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
