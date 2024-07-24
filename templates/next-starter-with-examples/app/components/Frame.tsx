import type { Metadata } from "next";
import { DebugLink } from "./DebugLink";
import { FrameFlattened } from "frames.js";

function getTitle(metadata: Metadata): string {
  if (typeof metadata.title === "string") {
    return metadata.title;
  }

  if (typeof metadata.openGraph?.title === "string") {
    return metadata.openGraph.title;
  }

  return "Missing title";
}

function getAspectRatio(metadata: Metadata): string {
  const frame = metadata.other as unknown as FrameFlattened;

  let [width, height] = (
    frame["fc:frame:image:aspect_ratio"] ??
    frame["of:image:aspect_ratio"] ??
    "1.91:1"
  )
    .split(":")
    .map(Number);

  if (frame["fc:frame:button:1"] || frame["of:button:1"]) {
    width! -= 0.25;
  }

  if (frame["fc:frame:input:text"] || frame["of:input:text"]) {
    width! -= 0.2;
  }

  return `${width}/${height}`;
}

type FrameProps = {
  metadata: Metadata;
  url: string;
  /**
   * @defaultValue 'https://i.frames.fun/embed'
   */
  iframeRendererUrl?: string;
};

export function Frame({
  metadata,
  url,
  iframeRendererUrl = "https://i.frames.fun/embed",
}: FrameProps) {
  const rendererUrl = new URL(iframeRendererUrl);

  rendererUrl.searchParams.set("dangerousSkipSigning", "false");
  rendererUrl.searchParams.set("frameUrl", url);

  const aspectRatio = getAspectRatio(metadata);

  return (
    <div className="flex mt-2">
      <div className="w-full max-w-[600px] mx-auto space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="font-semibold">{getTitle(metadata)}</h1>
          <DebugLink url={url} />
        </div>
        {process.env.NODE_ENV === "development" ? (
          <div
            className="flex w-full bg-slate-100 rounded items-center justify-center"
            style={{ aspectRatio }}
          >
            <span className="text-slate-500">
              On production, a frame will be shown here
            </span>
          </div>
        ) : (
          <iframe
            className="w-full"
            style={{ aspectRatio }}
            src={rendererUrl.toString()}
            title="Frames.fun (i)frame"
            referrerPolicy="no-referrer"
            seamless
            allow=""
          ></iframe>
        )}
      </div>
    </div>
  );
}
