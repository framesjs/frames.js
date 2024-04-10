import { load } from "cheerio";
import { parseFarcasterFrame } from "./farcaster";

describe("farcaster frame parser", () => {
  it("parses basic frame from metatags", () => {
    const document = load(`
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="http://example.com/image.png" />
      <meta property="og:image" content="http://example.com/image.png" />
    `);

    expect(parseFarcasterFrame(document)).toEqual({
      frame: {
        image: "http://example.com/image.png",
        ogImage: "http://example.com/image.png",
        version: "vNext",
      },
    });
  });

  describe("fc:frame", () => {
    it("fails if version is missing", () => {
      const document = load(`
        <meta property="fc:frame:image" content="http://example.com/image.png" />
        <meta property="og:image" content="http://example.com/image.png" />
      `);

      expect(parseFarcasterFrame(document)).toMatchObject({
        frame: {},
        errors: expect.objectContaining({
          "fc:frame": [
            {
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
      `);

      expect(parseFarcasterFrame(document)).toMatchObject({
        frame: {},
        errors: expect.objectContaining({
          "fc:frame": [
            { message: 'Invalid version "v1"', source: "farcaster" },
          ],
        }) as unknown,
      });
    });

    it("parses version", () => {
      const document = load(`
        <meta property="fc:frame" content="2022-01-01" />
        <meta property="fc:frame:image" content="http://example.com/image.png" />
        <meta property="og:image" content="http://example.com/image.png" />
      `);

      expect(parseFarcasterFrame(document)).toEqual({
        frame: {
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          version: "2022-01-01",
        },
      });
    });
  });

  describe("og:image", () => {
    it("fails if og image is missing", () => {
      const $ = load(`
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:image" content="http://example.com/image.png"/>
    `);

      expect(parseFarcasterFrame($)).toEqual({
        errors: {
          "og:image": [
            {
              message: 'Missing required meta tag "og:image"',
              source: "farcaster",
            },
          ],
        },
        frame: {
          version: "vNext",
          image: "http://example.com/image.png",
        },
      });
    });

    it("parses og image", () => {
      const $ = load(`
    <meta name="fc:frame" content="vNext"/>
    <meta name="fc:frame:image" content="http://example.com/image.png"/>
    <meta name="og:image" content="http://example.com/og-image.png"/>
    `);

      expect(parseFarcasterFrame($)).toEqual({
        frame: {
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/og-image.png",
        },
      });
    });
  });

  describe("fc:image", () => {
    it("fails if image missing", () => {
      const document = load(`
        <meta property="fc:frame" content="vNext" />
        <meta property="og:image" content="http://example.com/image.png" />
      `);

      expect(parseFarcasterFrame(document)).toMatchObject({
        frame: {
          version: "vNext",
          ogImage: "http://example.com/image.png",
        },
        errors: expect.objectContaining({
          "fc:frame:image": [
            {
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
      `);

      expect(parseFarcasterFrame(document)).toEqual({
        frame: {
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          version: "vNext",
        },
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
    `);

      expect(parseFarcasterFrame(document)).toEqual({
        frame: {
          image: "http://example.com/image.png",
          version: "vNext",
          imageAspectRatio: "1:1",
          ogImage: "http://example.com/image.png",
        },
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
      `);

      expect(parseFarcasterFrame(document)).toEqual({
        frame: {
          image: "http://example.com/image.png",
          version: "vNext",
          inputText: "Enter a message",
          ogImage: "http://example.com/image.png",
        },
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
      `);

      expect(parseFarcasterFrame(document)).toMatchObject({
        frame: {
          version: "vNext",
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
        },
        errors: expect.objectContaining({
          "fc:frame:post_url": [
            {
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
      `);

      expect(parseFarcasterFrame(document)).toEqual({
        frame: {
          image: "http://example.com/image.png",
          version: "vNext",
          postUrl: "http://example.com/post",
          ogImage: "http://example.com/image.png",
        },
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
      `);

      expect(parseFarcasterFrame(document)).toEqual({
        frame: {
          image: "http://example.com/image.png",
          ogImage: "http://example.com/image.png",
          version: "vNext",
          state: "state",
        },
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
    `);

      expect(parseFarcasterFrame(document)).toEqual({
        frame: {
          image: "http://example.com/image.png",
          version: "vNext",
          ogImage: "http://example.com/image.png",
          buttons: [
            {
              label: "1",
              action: "link",
              target: "http://example.com",
            },
          ],
        },
      });
    });
  });
});
