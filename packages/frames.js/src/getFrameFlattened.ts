import { version as framesjsVersion } from "../package.json";
import type { Frame, FrameFlattened } from "./types";

/**
 * Takes a `Frame` and formats it as an intermediate step before rendering as html
 * @param frame - The `Frame` to flatten
 * @returns a plain object with frame metadata keys and values according to the frame spec, using their lengthened syntax, e.g. "fc:frame:image"
 */
export function getFrameFlattened(frame: Frame): FrameFlattened {
  const openFrames =
    frame.accepts && Boolean(frame.accepts.length)
      ? {
          // custom of tags
          [`of:version`]: frame.version,
          ...frame.accepts.reduce(
            (acc: Record<string, string>, { id, version }) => {
              acc[`of:accepts:${id}`] = version;
              return acc;
            },
            {}
          ),
          // same as fc:frame tags
          [`of:image`]: frame.image,
          [`of:post_url`]: frame.postUrl,
          [`of:input:text`]: frame.inputText,
          ...(frame.state ? { [`of:state`]: frame.state } : {}),
          ...(frame.imageAspectRatio
            ? { [`of:image:aspect_ratio`]: frame.imageAspectRatio }
            : {}),
          ...frame.buttons?.reduce(
            (acc, button, index) => ({
              ...acc,
              [`of:button:${index + 1}`]: button.label,
              [`of:button:${index + 1}:action`]: button.action,
              [`of:button:${index + 1}:target`]: button.target,
              ...(button.action === "tx"
                ? { [`of:button:${index + 1}:post_url`]: button.post_url }
                : {}),
            }),
            {}
          ),
        }
      : {};

  const metadata: FrameFlattened = {
    [`og:image`]: frame.ogImage || frame.image,
    [`fc:frame`]: frame.version,
    [`fc:frame:image`]: frame.image,
    [`fc:frame:post_url`]: frame.postUrl,
    [`fc:frame:input:text`]: frame.inputText,
    ...(frame.state ? { [`fc:frame:state`]: frame.state } : {}),
    ...(frame.imageAspectRatio
      ? { [`fc:frame:image:aspect_ratio`]: frame.imageAspectRatio }
      : {}),
    ...frame.buttons?.reduce(
      (acc, button, index) => ({
        ...acc,
        [`fc:frame:button:${index + 1}`]: button.label,
        [`fc:frame:button:${index + 1}:action`]: button.action,
        [`fc:frame:button:${index + 1}:target`]: button.target,
        ...(button.action === "tx"
          ? { [`fc:frame:button:${index + 1}:post_url`]: button.post_url }
          : {}),
      }),
      {}
    ),
    ...openFrames,
    [`frames.js:version`]: framesjsVersion,
  };

  return metadata;
}
