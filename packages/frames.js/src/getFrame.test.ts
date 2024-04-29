import { version as framesVersion } from "../package.json";
import { getFrame } from "./getFrame";
import { getFrameHtml } from "./getFrameHtml";
import type { Frame } from "./types";

describe("getFrame", () => {
  it("should parse html meta tags (farcaster)", () => {
    const htmlString = `
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="http://example.com/image.png" />
    <meta name="og:image" content="http://example.com/image.png"/>
    <meta name="fc:frame:button:1" content="Green" />
    <meta name="fc:frame:button:2" content="Purple" />
    <meta name="fc:frame:button:3" content="Red" />
    <meta name="fc:frame:button:4" content="Blue" />
    <meta name="fc:frame:post_url" content="https://example.com" />
    <meta name="fc:frame:input:text" content="Enter a message" />
    <title>test</title>
  `;

    expect(
      getFrame({
        htmlString,
        url: "https://example.com",
      })
    ).toEqual({
      status: "success",
      frame: {
        version: "vNext",
        image: "http://example.com/image.png",
        ogImage: "http://example.com/image.png",
        buttons: [
          {
            label: "Green",
            action: "post",
            target: undefined,
          },
          {
            label: "Purple",
            action: "post",
            target: undefined,
          },
          {
            label: "Red",
            action: "post",
            target: undefined,
          },
          {
            label: "Blue",
            action: "post",
            target: undefined,
          },
        ],
        postUrl: "https://example.com/",
        inputText: "Enter a message",
      },
      reports: {},
    });
  });

  it("should parse button actions (farcaster)", () => {
    const html = `
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:post_url" content="https://example.com"/>
    <meta name="fc:frame:image" content="http://example.com/image.png"/>
    <meta name="og:image" content="http://example.com/image.png"/>
    <meta name="fc:frame:button:1" content="1"/>
    <meta name="fc:frame:button:2" content="2"/>
    <meta name="fc:frame:button:2:action" content="post_redirect"/>
    <meta name="fc:frame:button:3" content="3" />
    <meta name="fc:frame:button:3:action" content="link" />
    <meta name="fc:frame:button:3:target" content="https://example.com" />
    <meta name="fc:frame:button:4" content="Mint" />
    <meta name="fc:frame:button:4:action" content="mint" />
    <meta name="fc:frame:button:4:target" content="eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df" />
    <title>test</title>
    `;
    const frame = getFrame({
      htmlString: html,
      url: "https://example.com",
    });

    expect(frame).toEqual({
      status: "success",
      frame: {
        version: "vNext",
        image: "http://example.com/image.png",
        ogImage: "http://example.com/image.png",
        buttons: [
          {
            label: "1",
            action: "post",
            target: undefined,
          },
          {
            label: "2",
            action: "post_redirect",
            target: undefined,
          },
          {
            label: "3",
            action: "link",
            target: "https://example.com",
          },
          {
            label: "Mint",
            action: "mint",
            target: "eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
          },
        ],
        postUrl: "https://example.com/",
      },
      reports: {},
      framesVersion: undefined,
    });
  });

  it("should convert a Farcaster Frame HTML into a Frame object", () => {
    const exampleFrame: Frame = {
      version: "vNext",
      image: "http://example.com/image.png",
      ogImage: "http://example.com/image.png",
      postUrl: "https://example.com/",
      accepts: [
        {
          id: "xmtp",
          version: "vNext",
        },
      ],
      buttons: [
        {
          action: "post",
          label: "1",
          target: undefined,
        },
        {
          action: "post_redirect",
          label: "2",
          target: undefined,
        },
        {
          action: "link",
          label: "3",
          target: "https://example.com",
        },
        {
          action: "mint",
          label: "Mint",
          target: "eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
        },
      ],
    };

    const html = getFrameHtml(exampleFrame);

    const parsedFrame = getFrame({
      htmlString: html,
      url: "https://example.com",
    });

    expect(parsedFrame).toEqual({
      status: "success",
      frame: { ...exampleFrame, accepts: undefined },
      reports: {},
      framesVersion,
    });
  });

  it("should parse open frames tags", () => {
    const html = `
    <meta name="of:version" content="vNext" />
    <meta name="of:accepts:some" content="vNext" />
    <meta name="of:image" content="http://example.com/image.png" />
    <meta name="og:image" content="http://example.com/image.png" />
    <meta name="of:button:1" content="Green" />
    <meta name="of:button:2" content="Purple" />
    <meta name="of:button:3" content="Red" />
    <meta name="of:button:4" content="Blue" />
    <meta name="of:post_url" content="https://example.com" />
    <meta name="of:input:text" content="Enter a message" />
    <title>test</title>
  `;

    const frame = getFrame({
      htmlString: html,
      url: "https://example.com",
      specification: "openframes",
    });

    expect(frame).not.toBeNull();
    expect(frame).toEqual({
      status: "success",
      frame: {
        accepts: [{ id: "some", version: "vNext" }],
        version: "vNext",
        image: "http://example.com/image.png",
        ogImage: "http://example.com/image.png",
        buttons: [
          {
            label: "Green",
            action: "post",
            target: undefined,
          },
          {
            label: "Purple",
            action: "post",
            target: undefined,
          },
          {
            label: "Red",
            action: "post",
            target: undefined,
          },
          {
            label: "Blue",
            action: "post",
            target: undefined,
          },
        ],
        postUrl: "https://example.com/",
        inputText: "Enter a message",
      },
      reports: {},
    });
  });

  it("should parse values with escaped html values", () => {
    const html = `
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="http://example.com/image.png" />
    <meta name="og:image" content="http://example.com/image.png" />
    <meta name="fc:frame:state" content="{&quot;test&quot;:&quot;&#39;&gt;&lt;&&quot;}"/>
    <title>test</title>
  `;

    const result = getFrame({ htmlString: html, url: "https://example.com" });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- this is test
    expect(JSON.parse(result.frame.state!)).toEqual({
      test: "'><&",
    });
  });

  it("should parse frames.js version from meta tags", () => {
    const html = `
    <meta name="frames.js:version" content="1.0.0" />
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="http://example.com/image.png" />
    <meta name="og:image" content="http://example.com/image.png" />
    <meta name="fc:frame:state" content="{&quot;test&quot;:&quot;&#39;&gt;&lt;&&quot;}"/>
    <title>test</title>
  `;

    const result = getFrame({ htmlString: html, url: "https://example.com" });

    expect(result.framesVersion).toEqual("1.0.0");
  });
});
