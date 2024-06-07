import { cn } from "@/lib/utils";
import type { FramesStackItem } from "@frames.js/render";
import { deserializeJsx } from "frames.js/middleware/jsx-utils";
import { useEffect, useState } from "react";
import { renderImage } from "../lib/render-image";
import { Loader } from "lucide-react";

type FrameDebuggerImageProps = {
  stackItem: FramesStackItem;
};

export function FrameDebuggerImage({ stackItem }: FrameDebuggerImageProps) {
  const [isRendering, setIsRendering] = useState(true);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (
      "frameResult" in stackItem &&
      stackItem.frameResult.framesDebugInfo?.jsx
    ) {
      const aspectRatio =
        stackItem.frameResult.frame.imageAspectRatio ?? "1.91:1";
      const imageJsx = deserializeJsx(
        stackItem.frameResult.framesDebugInfo.jsx
      );

      setIsRendering(true);

      renderImage(imageJsx, aspectRatio)
        .then(setSvg)
        .finally(() => setIsRendering(false));
    } else {
      setSvg(null);
    }
  }, [stackItem]);

  if (!("frameResult" in stackItem)) {
    return (
      <div className="place-content-center w-full h-full">
        <div className="text-center max-w-[300px] mx-auto">
          <h3 className="mt-2 text-base font-semibold text-gray-900">
            Frame is not ready
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            The frame is not ready yet or is invalid.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Please fix the issues and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!stackItem.frameResult.framesDebugInfo?.jsx) {
    return (
      <div className="place-content-center w-full h-full">
        <div className="text-center max-w-[300px] mx-auto">
          <h3 className="mt-2 text-base font-semibold text-gray-900">
            Missing image definition
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            In order to debug the image you need to provide a JSX definition for
            it.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Make sure you are debugging a frame created by Frames.js and{" "}
            <span className="font-mono bg-slate-100 p-1 border border-slate-200">
              debug
            </span>{" "}
            mode is enabled.
          </p>
        </div>
      </div>
    );
  }

  if (isRendering || !svg) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
        <Loader className="animate-spin"></Loader>
        <span className="text-sm text-gray-500">Rendering...</span>
      </div>
    );
  }

  const aspectRatio = stackItem.frameResult.frame.imageAspectRatio ?? "1.91:1";

  return (
    <>
      <style jsx global>{`
        .image-preview > svg {
          width: 100%;
          height: 100%;
        }
      `}</style>
      <div
        className={cn(
          aspectRatio === "1:1" ? "aspect-square" : "aspect-[1.91/1]",
          "max-h-[400px]",
          "image-preview"
        )}
        dangerouslySetInnerHTML={{ __html: svg }}
      ></div>
    </>
  );
}
