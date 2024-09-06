import { version as framesjsVersion } from "../package.json";
import type { Frame, FrameFlattened } from "./types";

export function getFrameFlattened(
  frame: Frame,
  overrides?: Partial<FrameFlattened>
): FrameFlattened;
export function getFrameFlattened(
  frame: Partial<Frame>,
  overrides?: Partial<FrameFlattened>
): Partial<FrameFlattened>;

/**
 * Takes a `Frame` and formats it as an intermediate step before rendering as html
 * @returns a plain object with frame metadata keys and values according to the frame spec, using their lengthened syntax, e.g. "fc:frame:image"
 */
export function getFrameFlattened(
  /**
   * The frame to flatten
   */
  frame: Partial<Frame>,
  /**
   * Optional overrides to apply to the frame
   */
  overrides?: Partial<FrameFlattened>
): Partial<FrameFlattened> {
  const openFrames =
    frame.accepts && Boolean(frame.accepts.length)
      ? {
          // custom of tags
          "of:version": frame.version,
          ...frame.accepts.reduce(
            (acc: Record<string, string>, { id, version }) => {
              acc[`of:accepts:${id}`] = version;
              return acc;
            },
            {}
          ),
          // same as fc:frame tags
          "of:image": frame.image,
          "og:image": frame.ogImage || frame.image,
          "og:title": frame.title,
          "of:post_url": frame.postUrl,
          "of:input:text": frame.inputText,
          ...(frame.state ? { "of:state": frame.state } : {}),
          ...(frame.imageAspectRatio
            ? { "of:image:aspect_ratio": frame.imageAspectRatio }
            : {}),
          ...frame.buttons?.reduce(
            (acc, button, index) => ({
              ...acc,
              [`of:button:${index + 1}`]: button.label,
              [`of:button:${index + 1}:action`]: button.action,
              [`of:button:${index + 1}:target`]: button.target,
              ...(button.action === "tx" ||
              button.action === "post" ||
              button.action === "post_redirect"
                ? { [`of:button:${index + 1}:post_url`]: button.post_url }
                : {}),
            }),
            {}
          ),
        }
      : {};

  const metadata: Partial<FrameFlattened> = {
    "fc:frame": frame.version,
    "fc:frame:image": frame.image,
    "og:image": frame.ogImage || frame.image,
    "og:title": frame.title,
    "fc:frame:post_url": frame.postUrl,
    "fc:frame:input:text": frame.inputText,
    ...(frame.title ? { "og:title": frame.title } : {}),
    ...(frame.state ? { "fc:frame:state": frame.state } : {}),
    ...(frame.imageAspectRatio
      ? { "fc:frame:image:aspect_ratio": frame.imageAspectRatio }
      : {}),
    ...frame.buttons?.reduce(
      (acc, button, index) => ({
        ...acc,
        [`fc:frame:button:${index + 1}`]: button.label,
        [`fc:frame:button:${index + 1}:action`]: button.action,
        [`fc:frame:button:${index + 1}:target`]: button.target,
        ...(button.action === "tx" ||
        button.action === "post" ||
        button.action === "post_redirect"
          ? { [`fc:frame:button:${index + 1}:post_url`]: button.post_url }
          : {}),
      }),
      {}
    ),
    ...openFrames,
    [`frames.js:version`]: framesjsVersion,
    ...overrides,
  };

  return metadata;
}
