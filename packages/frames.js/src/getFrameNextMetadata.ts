import { Frame } from "./types";

export function getFrameNextMetadata(frame: Frame) {
  const metadata: any = {
    "fc:frame": frame.version,
    "fc:frame:image": frame.image,
    "fc:frame:post_url": frame.postUrl,
    "fc:frame:refresh_period": frame.refreshPeriod,
  };

  frame.buttons?.forEach((button, index) => {
    metadata[`fc:frame:button:${index + 1}`] = button.label;
    metadata[`fc:frame:button:${index + 1}:action`] = button.action;
  });

  return metadata;
}
