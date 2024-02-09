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
  <meta property="fc:frame:input:text" content="Enter a message" />
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
    inputText: "Enter a message",
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
    <meta name="fc:frame:image" content="http:/example.com/image.png"/>
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
      image: "http:/example.com/image.png",
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
      postUrl: "https://example.com",
    });
  });

  it("should accept valid aspect ratio", () => {
    const html = `
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:post_url" content="https://example.com"/>
    <meta name="fc:frame:image" content="http:/example.com/image.png"/>
    <meta name="fc:frame:image:aspect_ratio" content="1:91"/>
    `;
    const { frame } = getFrame({
      htmlString: html,
      url: "https://example.com",
    });

    expect(frame?.imageAspectRatio).toEqual("1:91");

    const html2 = `
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:post_url" content="https://example.com"/>
    <meta name="fc:frame:image" content="http:/example.com/image.png"/>
    <meta name="fc:frame:image:aspect_ratio" content="1:1"/>
    `;

    const { frame: frame2 } = getFrame({
      htmlString: html2,
      url: "https://example.com",
    });

    expect(frame2?.imageAspectRatio).toEqual("1:1");
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
      image: "http:/example.com/image.png",
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
      postUrl: "https://example.com",
    };

    const html = getFrameHtml(exampleFrame);

    const parsedFrame = getFrame({
      htmlString: html,
      url: "https://example.com",
    }).frame;

    expect(parsedFrame).toEqual(exampleFrame);
  });
});
