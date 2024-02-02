import { Frame, FrameFlattened } from "./types";

export function getFrameFlattened(frame: Frame): FrameFlattened {
  const metadata = {
    "fc:frame": frame.version,
    "fc:frame:image": frame.image,
    "fc:frame:post_url": frame.postUrl,
    ...frame.buttons?.reduce(
      (acc, button, index) => ({
        ...acc,
        [`fc:frame:button:${index + 1}`]: button.label,
        [`fc:frame:button:${index + 1}:action`]: button.action,
      }),
      {}
    ),
  };

  return metadata;
}
