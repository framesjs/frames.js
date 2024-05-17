import { load } from "cheerio";
import { parseOpenFramesFrame } from "./open-frames";
import { createReporter } from "./reporter";

const fallbackPostUrl = "http://fallback.com/post";

describe("open frames frame parser", () => {
  let reporter = createReporter("openframes");

  beforeEach(() => {
    reporter = createReporter("openframes");
  });

  it("parses basic frame meta tags", () => {
    const $ = load(`
    <meta name="of:version" content="vNext"/>
    <meta name="of:accepts:some_protocol" content="vNext"/> 
    <meta name="of:image" content="http://example.com/image.png"/>
    <meta name="og:image" content="http://example.com/og-image.png"/>
    <title>Test</title>
    `);

    expect(
      parseOpenFramesFrame($, { farcasterFrame: {}, reporter, fallbackPostUrl })
    ).toEqual({
      status: "success",
      reports: {},
      frame: {
        accepts: [{ id: "some_protocol", version: "vNext" }],
        version: "vNext",
        image: "http://example.com/image.png",
        ogImage: "http://example.com/og-image.png",
        postUrl: fallbackPostUrl,
      },
    });
  });

  it('falls back to farcaster frame data if "of:accepts:farcaster" is present', () => {
    const $ = load(`
    <meta name="of:version" content="vNext"/>
    <meta name="of:accepts:farcaster" content="vNext"/>
    <meta name="og:image" content="http://example.com/og-image.png"/>
    <title>Test</title>
    `);

    expect(
      parseOpenFramesFrame($, {
        farcasterFrame: {
          version: "vNext",
          image: "http://example.com/farcaster-image.png",
        },
        fallbackPostUrl,
        reporter,
      })
    ).toEqual({
      status: "success",
      reports: {},
      frame: {
        accepts: [{ id: "farcaster", version: "vNext" }],
        version: "vNext",
        image: "http://example.com/farcaster-image.png",
        ogImage: "http://example.com/og-image.png",
        postUrl: fallbackPostUrl,
      },
    });
  });

  describe("of:version", () => {
    it("fails if is missing", () => {
      const $ = load(`
      <meta name="of:accepts:some_protocol" content="vNext"/> 
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "failure",
        reports: {
          "of:version": [
            {
              level: "error",
              message: 'Missing required meta tag "of:version"',
              source: "openframes",
            },
          ],
        },
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });

    it('does not fallback to fc:frame if "of:accepts:farcaster" is present and of:version is missing', () => {
      const $ = load(`
      <meta name="of:accepts:farcaster" content="vNext"/>
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "failure",
        reports: {
          "of:version": [
            {
              level: "error",
              message: 'Missing required meta tag "of:version"',
              source: "openframes",
            },
          ],
        },
        frame: {
          accepts: [{ id: "farcaster", version: "vNext" }],
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });

    it("parses version", () => {
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:some_protocol" content="vNext"/> 
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });
  });

  describe("of:accepts:*", () => {
    it("fails if missing", () => {
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "failure",
        frame: {
          accepts: [],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
        reports: {
          "of:accepts:{protocol_identifier}": [
            {
              level: "error",
              message:
                'At least one "of:accepts:{protocol_identifier}" meta tag is required',
              source: "openframes",
            },
          ],
        },
      });
    });

    it("parses accepts", () => {
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:farcaster" content="vNext"/>
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "farcaster", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });
  });

  describe("og:image", () => {
    it("warns if og image is missing", () => {
      const $ = load(`
    <meta name="of:version" content="vNext"/>
    <meta name="of:accepts:some_protocol" content="vNext"/> 
    <meta name="of:image" content="http://example.com/image.png"/>
    <title>Test</title>
    `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {
          "og:image": [
            {
              level: "warning",
              message: 'Missing meta tag "og:image"',
              source: "openframes",
            },
          ],
        },
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });

    it("parses og image", () => {
      const $ = load(`
    <meta name="of:version" content="vNext"/>
    <meta name="of:accepts:some_protocol" content="vNext"/> 
    <meta name="of:image" content="http://example.com/image.png"/>
    <meta name="og:image" content="http://example.com/og-image.png"/>
    <title>Test</title>
    `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });
  });

  describe("of:image", () => {
    it("fails if image is missing", () => {
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:some_protocol" content="vNext"/> 
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "failure",
        reports: {
          "of:image": [
            {
              level: "error",
              message: 'Missing required meta tag "of:image"',
              source: "openframes",
            },
          ],
        },
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });

    it("falls back to farcaster image if image is missing and of:accepts:farcaster is present", () => {
      const $ = load(`
        <meta name="of:version" content="vNext"/>
        <meta name="of:accepts:farcaster" content="vNext"/>
        <meta name="og:image" content="http://example.com/og-image.png"/>
        <title>Test</title>
        `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {
            image: "http://example.com/farcaster-image.png",
          },
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "farcaster", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/farcaster-image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });

    it("parses image", () => {
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:some_protocol" content="vNext"/> 
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });
  });

  describe("of:image:aspect_ratio", () => {
    it("falls back to farcaster aspect ratio if of:accepts:farcaster is present", () => {
      const $ = load(`
        <meta name="of:version" content="vNext"/>
        <meta name="of:accepts:farcaster" content="vNext"/>
        <meta name="of:image" content="http://example.com/image.png"/>
        <meta name="og:image" content="http://example.com/og-image.png"/>
        <title>Test</title>
        `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {
            imageAspectRatio: "1.91:1",
          },
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "farcaster", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          imageAspectRatio: "1.91:1",
          postUrl: fallbackPostUrl,
        },
      });
    });

    it("parses valid aspect ratio", () => {
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:some_protocol" content="vNext"/> 
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <meta name="of:image:aspect_ratio" content="1.91:1"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          imageAspectRatio: "1.91:1",
          postUrl: fallbackPostUrl,
        },
      });
    });
  });

  describe("of:input:text", () => {
    it("falls back to fc:frame:input:text if of:accepts:farcaster is present and input text is missing", () => {
      const $ = load(`
        <meta name="of:version" content="vNext"/>
        <meta name="of:accepts:farcaster" content="vNext"/>
        <meta name="of:image" content="http://example.com/image.png"/>
        <meta name="og:image" content="http://example.com/og-image.png"/>
        <title>Test</title>
        `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {
            inputText: "input text",
          },
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "farcaster", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          inputText: "input text",
          postUrl: fallbackPostUrl,
        },
      });
    });

    it("parses valid input text", () => {
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:some_protocol" content="vNext"/> 
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <meta name="of:input:text" content="input text"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          inputText: "input text",
          postUrl: fallbackPostUrl,
        },
        reports: {},
      });
    });
  });

  describe("of:post_url", () => {
    it("fails if post_url is exceeding 256 bytes", () => {
      const url = new URL(`http://example.com/post${"A".repeat(257)}`);
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:some_protocol" content="vNext"/> 
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <meta name="of:post_url" content="${url.toString()}"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "failure",
        reports: {
          "of:post_url": [
            {
              level: "error",
              message:
                "Invalid URL. URL size exceeds 256 bytes limit (frames.js generates a longer post_url including system params).",
              source: "openframes",
            },
          ],
        },
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
        },
      });
    });

    it("does not fall back to fc:frame:post_url if of:accepts:farcaster is present and post url is missing", () => {
      const $ = load(`
        <meta name="of:version" content="vNext"/>
        <meta name="of:accepts:farcaster" content="vNext"/>
        <meta name="of:image" content="http://example.com/image.png"/>
        <meta name="og:image" content="http://example.com/og-image.png"/>
        <title>Test</title>
        `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {
            postUrl: "http://test.com",
          },
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "farcaster", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
        },
      });
    });

    it("parses post_url", () => {
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:some_protocol" content="vNext"/> 
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <meta name="of:post_url" content="http://example.com/post"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: "http://example.com/post",
        },
      });
    });
  });

  describe("of:state", () => {
    it("falls back to fc:frame:state if of:accepts:farcaster is present and state is missing", () => {
      const $ = load(`
        <meta name="of:version" content="vNext"/>
        <meta name="of:accepts:farcaster" content="vNext"/>
        <meta name="of:image" content="http://example.com/image.png"/>
        <meta name="og:image" content="http://example.com/og-image.png"/>
        <title>Test</title>
        `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {
            state: "state",
          },
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "farcaster", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
          state: "state",
        },
      });
    });

    it("parses state", () => {
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:some_protocol" content="vNext"/> 
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/>
      <meta name="of:state" content="state"/>
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
          state: "state",
        },
      });
    });
  });

  describe("of:button:*", () => {
    it("parses buttons", () => {
      const $ = load(`
      <meta name="of:version" content="vNext"/>
      <meta name="of:accepts:some_protocol" content="vNext"/> 
      <meta name="of:image" content="http://example.com/image.png"/>
      <meta name="og:image" content="http://example.com/og-image.png"/> 
      <meta property="of:button:1" content="1" />
      <meta property="of:button:1:action" content="mint" />
      <meta property="of:button:1:target" content="eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df" />
      <title>Test</title>
      `);

      expect(
        parseOpenFramesFrame($, {
          farcasterFrame: {},
          fallbackPostUrl,
          reporter,
        })
      ).toEqual({
        status: "success",
        reports: {},
        frame: {
          accepts: [{ id: "some_protocol", version: "vNext" }],
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
          postUrl: fallbackPostUrl,
          buttons: [
            {
              label: "1",
              action: "mint",
              target:
                "eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
            },
          ],
        },
      });
    });
  });
});
