import { parseFramesWithReports } from "./parseFramesWithReports";

describe("parseFramesWithReports", () => {
  it("parses available frames from html string (fallback to farcaster)", async () => {
    const html = `
      <meta name="fc:frame" content="vNext"/>
      <meta name="fc:frame:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/image.png"/>
      <meta name="fc:frame:post_url" content="https://example.com"/>
      <meta name="fc:frame:input:text" content="Enter a message"/>
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:farcaster" content="vNext" />
      <title>Test</title>
    `;

    const result = await parseFramesWithReports({
      html,
      fallbackPostUrl: "https://example.com",
      frameUrl: "https://example.com/",
    });

    expect(result).toMatchObject({
      farcaster: {
        frame: {
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          version: "vNext",
          inputText: "Enter a message",
          postUrl: "https://example.com/",
          title: "Test",
        },
        reports: {},
        status: "success",
        specification: "farcaster",
        framesVersion: undefined,
      },
      farcaster_v2: {
        status: "failure",
      },
      openframes: {
        frame: {
          accepts: [{ id: "farcaster", version: "vNext" }],
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          version: "vNext",
          inputText: "Enter a message",
          postUrl: "https://example.com/",
          title: "Test",
        },
        reports: {},
        status: "success",
        specification: "openframes",
        framesVersion: undefined,
      },
    });
  });

  it("parses available frames from html string", async () => {
    const html = `
      <meta name="fc:frame" content="vNext"/>
      <meta name="fc:frame:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/image.png"/>
      <meta name="fc:frame:post_url" content="https://example.com"/>
      <meta name="fc:frame:input:text" content="Enter a message"/>

      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:some" content="vNext" />
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="of:input:text" content="Enter a message"/>
      <title>Test</title>
    `;

    const result = await parseFramesWithReports({
      html,
      fallbackPostUrl: "https://example.com",
      frameUrl: "https://example.com/",
    });

    expect(result).toMatchObject({
      farcaster: {
        frame: {
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          version: "vNext",
          inputText: "Enter a message",
          postUrl: "https://example.com/",
          title: "Test",
        },
        reports: {},
        specification: "farcaster",
        framesVersion: undefined,
        status: "success",
      },
      farcaster_v2: {
        status: "failure",
      },
      openframes: {
        frame: {
          accepts: [{ id: "some", version: "vNext" }],
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          version: "vNext",
          inputText: "Enter a message",
          postUrl: "https://example.com/",
          title: "Test",
        },
        reports: {},
        status: "success",
        framesVersion: undefined,
        specification: "openframes",
      },
    });
  });
});
