import { getFrame } from "./getFrame";
import { getFrameHtml } from "./getFrameHtml";
import type { Frame } from "./types";

describe("getFrame", () => {
  const sampleHtml = `
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="http://example.com/image.png" />
  <meta property="fc:frame:button:1" content="Green" />
  <meta property="fc:frame:button:2" content="Purple" />
  <meta property="fc:frame:button:3" content="Red" />
  <meta property="fc:frame:button:4" content="Blue" />
  <meta property="fc:frame:post_url" content="https://example.com" />
  <meta property="fc:frame:input:text" content="Enter a message" />
`;

  const sampleFrame = {
    version: "vNext",
    image: "http://example.com/image.png",
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
    postUrl: "https://example.com",
    inputText: "Enter a message",
    imageAspectRatio: undefined,
    accepts: [],
  } as Frame;

  it("should parse html meta tags", () => {
    const htmlName = `
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="http://example.com/image.png" />
    <meta name="fc:frame:button:1" content="Green" />
    <meta name="fc:frame:button:2" content="Purple" />
    <meta name="fc:frame:button:3" content="Red" />
    <meta name="fc:frame:button:4" content="Blue" />
    <meta name="fc:frame:post_url" content="https://example.com" />
    <meta name="fc:frame:input:text" content="Enter a message" />
  `;

    expect(
      getFrame({
        htmlString: sampleHtml,
        url: "https://example.com",
      }).frame
    ).toEqual(sampleFrame);

    expect(
      getFrame({
        htmlString: htmlName,
        url: "https://example.com",
      }).frame
    ).toEqual(sampleFrame);
  });

  it("should parse button actions", () => {
    const html = `
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:post_url" content="https://example.com"/>
    <meta name="fc:frame:image" content="http://example.com/image.png"/>
    <meta name="fc:frame:button:1" content="1"/>
    <meta name="fc:frame:button:2" content="2"/>
    <meta name="fc:frame:button:2:action" content="post_redirect"/>
    <meta name="fc:frame:button:3" content="3" />
    <meta name="fc:frame:button:3:action" content="link" />
    <meta name="fc:frame:button:3:target" content="https://example.com" />
    <meta name="fc:frame:button:4" content="Mint" />
    <meta name="fc:frame:button:4:action" content="mint" />
    <meta name="fc:frame:button:4:target" content="eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df" />
    `;
    const { frame } = getFrame({
      htmlString: html,
      url: "https://example.com",
    });

    expect(frame).toEqual({
      version: "vNext",
      image: "http://example.com/image.png",
      buttons: [
        {
          label: "1",
          action: "post",
          post_url: undefined,
          target: undefined,
        },
        {
          label: "2",
          action: "post_redirect",
          post_url: undefined,
          target: undefined,
        },
        {
          label: "3",
          action: "link",
          post_url: undefined,
          target: "https://example.com",
        },
        {
          label: "Mint",
          action: "mint",
          post_url: undefined,
          target: "eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
        },
      ],
      postUrl: "https://example.com",
      inputText: undefined,
      imageAspectRatio: undefined,
      accepts: [],
    });
  });

  it("should accept valid aspect ratio", () => {
    const html = `
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:post_url" content="https://example.com"/>
    <meta name="fc:frame:image" content="http://example.com/image.png"/>
    <meta name="fc:frame:image:aspect_ratio" content="1:91"/>
    `;
    const { frame } = getFrame({
      htmlString: html,
      url: "https://example.com",
    });

    expect(frame.imageAspectRatio).toEqual("1:91");

    const html2 = `
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:post_url" content="https://example.com"/>
    <meta name="fc:frame:image" content="http://example.com/image.png"/>
    <meta name="fc:frame:image:aspect_ratio" content="1:1"/>
    `;

    const { frame: frame2 } = getFrame({
      htmlString: html2,
      url: "https://example.com",
    });

    expect(frame2.imageAspectRatio).toEqual("1:1");
  });

  it("should reject invalid aspect ratio", () => {
    const html = `
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:post_url" content="https://example.com"/>
    <meta name="fc:frame:image" content="http://example.com/image.png"/>
    <meta name="fc:frame:image:aspect_ratio" content="1:2"/>
    `;
    const { errors } = getFrame({
      htmlString: html,
      url: "https://example.com",
    });

    expect(errors?.["fc:frame:image:aspect_ratio"]).toEqual([
      "Invalid image aspect ratio",
    ]);
  });

  it("should convert a Farcaster Frame HTML into a Frame object", () => {
    const exampleFrame: Frame = {
      version: "vNext",
      image: "http://example.com/image.png",

      postUrl: "https://example.com",
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
      imageAspectRatio: undefined,
      inputText: undefined,
      state: undefined,
    };

    const html = getFrameHtml(exampleFrame);

    const parsedFrame = getFrame({
      htmlString: html,
      url: "https://example.com",
    }).frame;

    expect(parsedFrame).toEqual(exampleFrame);
  });

  it("should parse of:accepts", () => {
    const html = `
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:post_url" content="https://example.com"/>
    <meta name="fc:frame:image" content="http://example.com/image.png"/>
    <meta name="of:accepts:xmtp" content="vNext"/>
    <meta name="of:accepts:lens" content="1.5"/>
    `;
    const { frame } = getFrame({
      htmlString: html,
      url: "https://example.com",
    });

    expect(frame.accepts).toEqual([
      { id: "xmtp", version: "vNext" },
      { id: "lens", version: "1.5" },
    ]);
  });

  it("should parse open frames tags", () => {
    const html = `
    <meta name="of:version" content="vNext" />
    <meta name="of:image" content="http://example.com/image.png" />
    <meta name="of:button:1" content="Green" />
    <meta name="of:button:2" content="Purple" />
    <meta name="of:button:3" content="Red" />
    <meta name="of:button:4" content="Blue" />
    <meta name="of:post_url" content="https://example.com" />
    <meta name="of:input:text" content="Enter a message" />
  `;

    const frame = getFrame({ htmlString: html, url: "https://example.com" });

    expect(frame.frame).toEqual(sampleFrame);
  });

  it("should parse values with escaped html values", () => {
    const html = `
    <meta name="of:version" content="vNext" />
    <meta name="of:image" content="http://example.com/image.png" />
    <meta name="fc:frame:state" content="{&quot;test&quot;:&quot;&#39;&gt;&lt;&&quot;}"/>
  `;

    const frame = getFrame({ htmlString: html, url: "https://example.com" });

    expect(JSON.parse(frame.frame.state || "")).toEqual({ test: "'><&" });
  });
});
