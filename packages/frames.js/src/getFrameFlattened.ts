import { Frame, FrameFlattened } from "./types";

/**
 * Takes a `Frame` and formats it as an intermediate step before rendering as html
 * @param frame The `Frame` to flatten
 * @returns a plain object with frame metadata keys and values according to the frame spec, using their lengthened syntax, e.g. "fc:frame:image"
 */
export function getFrameFlattened(frame: Frame): FrameFlattened {
  const metadata = {
    "fc:frame": frame.version,
    "fc:frame:image": frame.image,
    "fc:frame:post_url": frame.postUrl,
    "fc:frame:input:text": frame.inputText,
    ...(frame.imageAspectRatio
      ? { [`fc:frame:image:aspect_ratio`]: frame.imageAspectRatio }
      : {}),
    ...frame.buttons?.reduce(
      (acc, button, index) => ({
        ...acc,

        [`fc:frame:button:${index + 1}`]: button.label,
        [`fc:frame:button:${index + 1}:action`]: button.action,
        [`fc:frame:button:${index + 1}:target`]: button.target,
      }),
      {}
    ),
  };

  return metadata;
}
