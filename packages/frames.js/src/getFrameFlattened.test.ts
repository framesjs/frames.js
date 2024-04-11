import type { Frame } from ".";
import { getFrameFlattened } from ".";

jest.mock(
  "../package.json",
  () => ({
    version: "0.0.0-mock",
  }),
  { virtual: true }
);

describe("getFrameFlattened", () => {
  it("should get flattened frame", () => {
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
      state: JSON.stringify({ foo: "bar" }),
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
      "og:image": "https://example.com/og-image.png",
      "fc:frame:post_url": "https://example.com/post",
      "fc:frame:input:text": "input",
      "fc:frame:image:aspect_ratio": "1:1",
      "fc:frame:button:1": "Button 1",
      "fc:frame:button:1:action": "post",
      "fc:frame:button:1:target": "target1",
      "fc:frame:button:2": "Button 2",
      "fc:frame:button:2:action": "post",
      "fc:frame:button:2:target": "target2",
      "fc:frame:state": JSON.stringify({ foo: "bar" }),
      "of:accepts:xmtp": "vNext",
      "of:accepts:farcaster": "vNext",
      "of:button:1": "Button 1",
      "of:button:1:action": "post",
      "of:button:1:target": "target1",
      "of:button:2": "Button 2",
      "of:button:2:action": "post",
      "of:button:2:target": "target2",
      "of:image": "https://example.com/image.png",
      "of:image:aspect_ratio": "1:1",
      "of:input:text": "input",
      "of:post_url": "https://example.com/post",
      "of:state": '{"foo":"bar"}',
      "of:version": "vNext",
      "frames.js:version": "0.0.0-mock",
    });
  });

  it("ignores empty post_url", () => {
    const frame: Frame = {
      version: "vNext",
      image: "https://example.com/image.png",
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
      state: JSON.stringify({ foo: "bar" }),
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
      "fc:frame:post_url": undefined,
      "og:image": "https://example.com/og-image.png",
      "fc:frame:input:text": "input",
      "fc:frame:image:aspect_ratio": "1:1",
      "fc:frame:button:1": "Button 1",
      "fc:frame:button:1:action": "post",
      "fc:frame:button:1:target": "target1",
      "fc:frame:button:2": "Button 2",
      "fc:frame:button:2:action": "post",
      "fc:frame:button:2:target": "target2",
      "fc:frame:state": JSON.stringify({ foo: "bar" }),
      "of:accepts:xmtp": "vNext",
      "of:accepts:farcaster": "vNext",
      "of:button:1": "Button 1",
      "of:button:1:action": "post",
      "of:button:1:post_url": undefined,
      "of:button:1:target": "target1",
      "of:button:2": "Button 2",
      "of:button:2:action": "post",
      "of:button:2:post_url": undefined,
      "of:button:2:target": "target2",
      "of:image": "https://example.com/image.png",
      "of:image:aspect_ratio": "1:1",
      "of:input:text": "input",
      "of:post_url": undefined,
      "of:state": '{"foo":"bar"}',
      "of:version": "vNext",
      "frames.js:version": "0.0.0-mock",
    });
  });
});
