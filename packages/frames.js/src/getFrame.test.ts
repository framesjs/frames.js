import { getFrame } from "./getFrame";
import { getFrameHtml } from "./getFrameHtml";
import { Frame } from "./types";

describe("getFrame", () => {
  const sampleHtml = `
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="http:/example.com/image.png" />
  <meta property="fc:frame:button:1" content="Green" />
  <meta property="fc:frame:button:2" content="Purple" />
  <meta property="fc:frame:button:3" content="Red" />
  <meta property="fc:frame:button:4" content="Blue" />
  <meta property="fc:frame:post_url" content="https://example.com" />
`;

  const sampleFrame = {
    version: "vNext",
    image: "http:/example.com/image.png",
    buttons: [
      {
        label: "Green",
        action: "post",
      },
      {
        label: "Purple",
        action: "post",
      },
      {
        label: "Red",
        action: "post",
      },
      {
        label: "Blue",
        action: "post",
      },
    ],
    postUrl: "https://example.com",
  } as Frame;

  it("should parse html meta tags", () => {
    const htmlName = `
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="http:/example.com/image.png" />
    <meta name="fc:frame:button:1" content="Green" />
    <meta name="fc:frame:button:2" content="Purple" />
    <meta name="fc:frame:button:3" content="Red" />
    <meta name="fc:frame:button:4" content="Blue" />
    <meta name="fc:frame:post_url" content="https://example.com" />
  `;

    expect(
      getFrame({
        text: sampleHtml,
        url: "https://example.com",
      })
    ).toEqual(sampleFrame);

    expect(
      getFrame({
        text: htmlName,
        url: "https://example.com",
      })
    ).toEqual(sampleFrame);
  });

  it("should parse html meta tags with name attributes", () => {
    const htmlName = `
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="http:/example.com/image.png" />
    <meta name="fc:frame:button:1" content="Green" />
    <meta name="fc:frame:button:2" content="Purple" />
    <meta name="fc:frame:button:3" content="Red" />
    <meta name="fc:frame:button:4" content="Blue" />
    <meta name="fc:frame:post_url" content="https://example.com" />
  `;
    const frame = getFrame({
      text: htmlName,
      url: "https://example.com",
    });
    expect(frame).toEqual({
      version: "vNext",
      image: "http:/example.com/image.png",
      buttons: [
        {
          label: "Green",
          action: "post",
        },
        {
          label: "Purple",
          action: "post",
        },
        {
          label: "Red",
          action: "post",
        },
        {
          label: "Blue",
          action: "post",
        },
      ],
      postUrl: "https://example.com",
    });
  });

  it("Parses button actions", () => {
    const html = `
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:post_url" content="https://example.com"/>
    <meta name="fc:frame:image" content="http:/example.com/image.png"/>
    <meta name="fc:frame:button:1" content="1"/>
    <meta name="fc:frame:button:2" content="2"/>
    <meta name="fc:frame:button:2:action" content="post_redirect"/>
    `;
    const frame = getFrame({
      text: html,
      url: "https://example.com",
    });

    expect(frame).toEqual({
      version: "vNext",
      image: "http:/example.com/image.png",
      buttons: [
        {
          label: "1",
          action: "post",
        },
        {
          label: "2",
          action: "post_redirect",
        },
      ],
      postUrl: "https://example.com",
    });
  });

  it("should convert a farcaster frame HTML into a Frame object", () => {
    const html = getFrameHtml(sampleFrame);
    const parsedFrame = getFrame({
      text: html,
      url: "https://example.com",
    });

    expect(parsedFrame).toEqual(sampleFrame);
  });
});
