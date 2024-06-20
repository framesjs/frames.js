import { load } from "cheerio";
import { parseFarcasterFrame } from "./farcaster";
import { createReporter } from "./reporter";

const fallbackPostUrl = "http://fallback.com/post";

describe("farcaster frame parser", () => {
  let reporter = createReporter("farcaster");

  beforeEach(() => {
    reporter = createReporter("farcaster");
  });

  it("parses basic frame from metatags", () => {
    const document = load(`
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="http://example.com/image.png" />
      <meta property="og:image" content="http://example.com/image.png" />
      <title>Test</title>
    `);

    expect(
      parseFarcasterFrame(document, { reporter, fallbackPostUrl })
    ).toEqual({
      status: "success",
      reports: {},
      frame: {
        image: "http://example.com/image.png",
        ogImage: "http://example.com/image.png",
        version: "vNext",
        postUrl: fallbackPostUrl,
        title: "Test",
      },
    });
  });

  describe("fc:frame", () => {
    it("fails if version is missing", () => {
      const document = load(`
        <meta property="fc:frame:image" content="http://example.com/image.png" />
        <meta property="og:image" content="http://example.com/image.png" />
        <title>Test</title>
      `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toMatchObject({
        status: "failure",
        frame: {},
        reports: expect.objectContaining({
          "fc:frame": [
            {
              level: "error",
              message: 'Missing required meta tag "fc:frame"',
              source: "farcaster",
            },
          ],
        }) as unknown,
      });
    });

    it("fails to parse malformed version", () => {
      const document = load(`
        <meta property="fc:frame" content="v1" />
        <meta property="fc:frame:image" content="http://example.com/image.png" />
        <meta property="og:image" content="http://example.com/image.png" />
        <title>Test</title>
      `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toMatchObject({
        status: "failure",
        frame: {},
        reports: expect.objectContaining({
          "fc:frame": [
            {
              level: "error",
              message: 'Invalid version "v1"',
              source: "farcaster",
            },
          ],
        }) as unknown,
      });
    });

    it("parses version", () => {
      const document = load(`
        <meta property="fc:frame" content="2022-01-01" />
        <meta property="fc:frame:image" content="http://example.com/image.png" />
        <meta property="og:image" content="http://example.com/image.png" />
        <title>Test</title>
      `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toEqual({
        status: "success",
        frame: {
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          version: "2022-01-01",
          postUrl: fallbackPostUrl,
          title: "Test",
        },
        reports: {},
      });
    });
  });

  describe("title", () => {
    it("warns if no <title> or meta[og:title] is present", () => {
      const $ = load(`
        <meta name="fc:frame" content="vNext"/>
        <meta name="fc:frame:image" content="http://example.com/image.png"/>
        <meta name="og:image" content="http://example.com/og-image.png"/>
      `);

      expect(
        parseFarcasterFrame($, {
          reporter,
          fallbackPostUrl,
          warnOnMissingTitle: true,
        })
      ).toEqual({
        status: "success",
        reports: {
          title: [
            {
              level: "warning",
              message:
                'Missing title, please provide <title> or <meta property="og:title"> tag.',
              source: "farcaster",
            },
          ],
        },
        frame: {
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });

    it("parses og:title meta tag first", () => {
      const $ = load(`
        <meta name="fc:frame" content="vNext"/>
        <meta name="fc:frame:image" content="http://example.com/image.png"/>
        <meta name="og:image" content="http://example.com/og-image.png"/>
        <meta name="og:title" content="Title og"/>
        <title>Test</title>
      `);

      expect(parseFarcasterFrame($, { reporter, fallbackPostUrl })).toEqual({
        status: "success",
        reports: {},
        frame: {
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
          title: "Title og",
        },
      });
    });

    it("falls to title tag if og:title is not present", () => {
      const $ = load(`
        <meta name="fc:frame" content="vNext"/>
        <meta name="fc:frame:image" content="http://example.com/image.png"/>
        <meta name="og:image" content="http://example.com/og-image.png"/>
        <title>Title</title>
      `);

      expect(parseFarcasterFrame($, { reporter, fallbackPostUrl })).toEqual({
        status: "success",
        reports: {},
        frame: {
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
          title: "Title",
        },
      });
    });
  });

  describe("og:image", () => {
    it("warns if og image is missing", () => {
      const $ = load(`
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:image" content="http://example.com/image.png"/>
    <title>Test</title>
    `);

      expect(parseFarcasterFrame($, { reporter, fallbackPostUrl })).toEqual({
        status: "success",
        reports: {
          "og:image": [
            {
              level: "warning",
              message: 'Missing meta tag "og:image"',
              source: "farcaster",
            },
          ],
        },
        frame: {
          version: "vNext",
          image: "http://example.com/image.png",
          postUrl: fallbackPostUrl,
          title: "Test",
        },
      });
    });

    it("parses og image", () => {
      const $ = load(`
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:image" content="http://example.com/image.png"/>
    <meta name="og:image" content="http://example.com/og-image.png"/>
    <title>Test</title>
    `);

      expect(parseFarcasterFrame($, { reporter, fallbackPostUrl })).toEqual({
        status: "success",
        reports: {},
        frame: {
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
          title: "Test",
        },
      });
    });
  });

  describe("fc:image", () => {
    it("fails if image missing", () => {
      const document = load(`
        <meta property="fc:frame" content="vNext" />
        <meta property="og:image" content="http://example.com/image.png" />
        <title>Test</title>
      `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toMatchObject({
        status: "failure",
        frame: {
          version: "vNext",
          ogImage: "http://example.com/image.png",
          postUrl: fallbackPostUrl,
          title: "Test",
        },
        reports: expect.objectContaining({
          "fc:frame:image": [
            {
              level: "error",
              message: 'Missing required meta tag "fc:frame:image"',
              source: "farcaster",
            },
          ],
        }) as unknown,
      });
    });

    it("parses image", () => {
      const document = load(`
        <meta property="fc:frame" content="vNext" />
        <meta property="og:image" content="http://example.com/image.png" />
        <meta property="fc:frame:image" content="http://example.com/image.png" />
        <title>Test</title>
      `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toEqual({
        status: "success",
        frame: {
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          postUrl: fallbackPostUrl,
          version: "vNext",
          title: "Test",
        },
        reports: {},
      });
    });
  });

  describe("fc:frame:image:aspect_ratio", () => {
    it("parses image aspect ratio", () => {
      const document = load(`
      <meta property="fc:frame" content="vNext" />
      <meta property="og:image" content="http://example.com/image.png" />
      <meta property="fc:frame:image" content="http://example.com/image.png" />
      <meta property="fc:frame:image:aspect_ratio" content="1:1" />
      <title>Test</title>
    `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toEqual({
        status: "success",
        frame: {
          image: "http://example.com/image.png",
          version: "vNext",
          postUrl: fallbackPostUrl,
          imageAspectRatio: "1:1",
          ogImage: "http://example.com/image.png",
          title: "Test",
        },
        reports: {},
      });
    });
  });

  describe("fc:frame:input:text", () => {
    it("parses input text", () => {
      const document = load(`
        <meta property="fc:frame" content="vNext" />
        <meta property="og:image" content="http://example.com/image.png" />
        <meta property="fc:frame:image" content="http://example.com/image.png" />
        <meta property="fc:frame:input:text" content="Enter a message" />
        <title>Test</title>
      `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toEqual({
        status: "success",
        frame: {
          image: "http://example.com/image.png",
          version: "vNext",
          postUrl: fallbackPostUrl,
          inputText: "Enter a message",
          ogImage: "http://example.com/image.png",
          title: "Test",
        },
        reports: {},
      });
    });
  });

  describe("fc:frame:post_url", () => {
    it("fails if post_url is exceeding 256 bytes", () => {
      const url = new URL(`http://example.com/post${"A".repeat(257)}`);
      const document = load(`
        <meta property="fc:frame" content="vNext" />
        <meta property="og:image" content="http://example.com/image.png" />
        <meta property="fc:frame:image" content="http://example.com/image.png" />
        <meta property="fc:frame:post_url" content="${url.toString()}" />
        <title>Test</title>
      `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toMatchObject({
        status: "failure",
        frame: {
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          title: "Test",
        },
        reports: expect.objectContaining({
          "fc:frame:post_url": [
            {
              level: "error",
              message:
                "Invalid URL. URL size exceeds 256 bytes limit (frames.js generates a longer post_url including system params).",
              source: "farcaster",
            },
          ],
        }) as unknown,
      });
    });

    it("parses post_url", () => {
      const document = load(`
        <meta property="fc:frame" content="vNext" />
        <meta property="og:image" content="http://example.com/image.png" />
        <meta property="fc:frame:image" content="http://example.com/image.png" />
        <meta property="fc:frame:post_url" content="http://example.com/post" />
        <title>Test</title>
      `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toEqual({
        status: "success",
        frame: {
          image: "http://example.com/image.png",
          version: "vNext",
          postUrl: "http://example.com/post",
          ogImage: "http://example.com/image.png",
          title: "Test",
        },
        reports: {},
      });
    });
  });

  describe("fc:frame:state", () => {
    it("parses state", () => {
      const document = load(`
        <meta property="fc:frame" content="vNext" />
        <meta property="og:image" content="http://example.com/image.png" />
        <meta property="fc:frame:image" content="http://example.com/image.png" />
        <meta property="fc:frame:state" content="state" />
        <title>Test</title>
      `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toEqual({
        status: "success",
        frame: {
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          postUrl: fallbackPostUrl,
          version: "vNext",
          state: "state",
          title: "Test",
        },
        reports: {},
      });
    });
  });

  describe("fc:frame:button:*", () => {
    it("parses buttons", () => {
      const document = load(`
      <meta property="fc:frame" content="vNext" />
      <meta property="og:image" content="http://example.com/image.png" />
      <meta property="fc:frame:image" content="http://example.com/image.png" />
      <meta property="fc:frame:button:1" content="1" />
      <meta property="fc:frame:button:1:action" content="link" />
      <meta property="fc:frame:button:1:target" content="http://example.com" />
      <title>Test</title>
    `);

      expect(
        parseFarcasterFrame(document, { reporter, fallbackPostUrl })
      ).toEqual({
        status: "success",
        frame: {
          image: "http://example.com/image.png",
          version: "vNext",
          ogImage: "http://example.com/image.png",
          postUrl: fallbackPostUrl,
          buttons: [
            {
              label: "1",
              action: "link",
              target: "http://example.com",
            },
          ],
          title: "Test",
        },
        reports: {},
      });
    });
  });
});
