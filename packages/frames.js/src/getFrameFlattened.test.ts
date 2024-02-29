import { Frame, getFrameFlattened, getTokenUrl } from ".";
import { zora } from "viem/chains";

describe("getFrameFlattened", () => {
  it("should get flattened frame", async () => {
    const frame: Frame = {
      version: "vNext",
      image: "https://example.com/image.png",
      postUrl: "https://example.com/post",
      buttons: [
        {
          label: "Button 1",
          action: "post",
          target: "target1",
        },
        {
          label: "Button 2",
          action: "post",
          target: "target2",
        },
      ],
      imageAspectRatio: "1:1",
      inputText: "input",
      ogImage: "https://example.com/og-image.png",
      accepts: [
        {
          id: "xmtp",
          version: "vNext",
        },
        {
          id: "farcaster",
          version: "vNext",
        },
      ],
    };

    const flattened = getFrameFlattened(frame);

    expect(flattened).toEqual({
      "fc:frame": "vNext",
      "fc:frame:image": "https://example.com/image.png",
      "fc:frame:post_url": "https://example.com/post",
      "fc:frame:input:text": "input",
      "fc:frame:image:aspect_ratio": "1:1",
      "fc:frame:button:1": "Button 1",
      "fc:frame:button:1:action": "post",
      "fc:frame:button:1:target": "target1",
      "fc:frame:button:2": "Button 2",
      "fc:frame:button:2:action": "post",
      "fc:frame:button:2:target": "target2",
      "of:accepts:xmtp": "vNext",
      "of:accepts:farcaster": "vNext",
    });
  });
});
