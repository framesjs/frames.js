import { parseFramesWithReports } from "./parseFramesWithReports";

describe("parseFramesWithReports", () => {
  it("parses available frames from html string (fallback to farcaster)", () => {
    const html = `
      <!doctype html>
      <meta name="fc:frame" content="vNext"/>
      <meta name="fc:frame:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/image.png"/>
      <meta name="fc:frame:post_url" content="https://example.com"/>
      <meta name="fc:frame:input:text" content="Enter a message"/>
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:farcaster" content="vNext" />
      <title>Test</title>
    `;

    const result = parseFramesWithReports({
      html,
      fallbackPostUrl: "https://example.com",
    });

    expect(result).toEqual({
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
      },
    });
  });

  it("parses available frames from html string", () => {
    const html = `
      <!doctype html>
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

    const result = parseFramesWithReports({
      html,
      fallbackPostUrl: "https://example.com",
    });

    expect(result).toEqual({
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
      },
    });
  });

  it("fails on invalid html (missing doctype) but parses the frame if there are meta tags", () => {
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

    const result = parseFramesWithReports({
      html,
      fallbackPostUrl: "https://example.com",
    });

    expect(result).toEqual({
      farcaster: {
        frame: {
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          version: "vNext",
          inputText: "Enter a message",
          postUrl: "https://example.com/",
          title: "Test",
        },
        reports: {
          "*": [
            {
              level: "error",
              message: "Document is missing doctype",
              source: "farcaster",
            },
          ],
        },
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
        reports: {
          "*": [
            {
              level: "error",
              message: "Document is missing doctype",
              source: "openframes",
            },
          ],
        },
        status: "failure",
      },
    });
  });
});
