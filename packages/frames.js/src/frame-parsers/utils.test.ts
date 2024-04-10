import { load } from "cheerio";
import {
  parseButtons,
  validateFrameImage,
  validateInputText,
  validateAspectRatio,
  validateState,
  validateUrl,
} from "./utils";
import { createReporter } from "./reporter";

describe("parseButtons", () => {
  let reporter = createReporter("farcaster");

  beforeEach(() => {
    reporter = createReporter("farcaster");
  });

  it("fails if unrecognized button meta tag is present", () => {
    const document = load(`
      <meta property="fc:frame:button:1" content="1" />
      <meta property="fc:frame:button:1:action" content="link" />
      <meta property="fc:frame:button:1:target" content="http://example.com" />
      <meta property="fc:frame:button:1:extra" content="unknown" />
    `);

    expect(
      parseButtons(document, reporter, "fc:frame:button")
    ).not.toHaveLength(0);
    expect(reporter.toObject()).toEqual({
      "fc:frame:button:1:extra": [
        {
          level: "error",
          message: "Unrecognized meta tag",
          source: "farcaster",
        },
      ],
    });
  });

  it("fails if duplicate button meta tags are present", () => {
    const document = load(`
      <meta property="fc:frame:button:1" content="1" />
      <meta property="fc:frame:button:1:action" content="link" />
      <meta property="fc:frame:button:1:target" content="http://example.com" />
      <meta property="fc:frame:button:1:target" content="http://example.com" />
    `);

    expect(
      parseButtons(document, reporter, "fc:frame:button")
    ).not.toHaveLength(0);
    expect(reporter.toObject()).toEqual({
      "fc:frame:button:1:target": [
        { level: "error", message: "Duplicate meta tag", source: "farcaster" },
      ],
    });
  });

  it("fails if button number is outside of allowed range", () => {
    const document = load(`
      <meta property="fc:frame:button:0" content="1" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toHaveLength(0);
    expect(reporter.toObject()).toEqual({
      "fc:frame:button:0": [
        {
          level: "error",
          message: "Unrecognized meta tag",
          source: "farcaster",
        },
      ],
    });
  });

  it("fails if button label is missing", () => {
    const document = load(`
      <meta property="fc:frame:button:1:action" content="post" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toHaveLength(0);
    expect(reporter.toObject()).toEqual({
      "fc:frame:button:1": [
        {
          level: "error",
          message: "Missing button label",
          source: "farcaster",
        },
      ],
    });
  });

  it("does not fail if button action is missing and treats it as post button", () => {
    const document = load(`
      <meta property="fc:frame:button:1" content="1" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toEqual([
      {
        label: "1",
        action: "post",
        target: undefined,
      },
    ]);
    expect(reporter.toObject()).toEqual({});
  });

  it("fails if button action is unrecognized", () => {
    const document = load(`
      <meta property="fc:frame:button:1" content="1" />
      <meta property="fc:frame:button:1:action" content="unknown" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toHaveLength(0);
    expect(reporter.toObject()).toEqual({
      "fc:frame:button:1:action": [
        {
          level: "error",
          message: "Invalid button action",
          source: "farcaster",
        },
      ],
    });
  });

  it("fails if gaps are detected in button sequence", () => {
    const document = load(`
      <meta property="fc:frame:button:2" content="1" />
      <meta property="fc:frame:button:2:action" content="link" />
      <meta property="fc:frame:button:2:target" content="http://test.com" />
      <meta property="fc:frame:button:3" content="3" />
      <meta property="fc:frame:button:3:action" content="link" />
      <meta property="fc:frame:button:3:target" content="http://test.com" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toHaveLength(2);
    expect(reporter.toObject()).toEqual({
      "fc:frame:button:2": [
        {
          level: "error",
          message: "Button sequence is not continuous",
          source: "farcaster",
        },
      ],
    });
  });

  it.todo(
    "falls back to farcaster provided buttons and fills gaps in sequence"
  );

  it("fails to parse link button without target", () => {
    const document = load(`
      <meta property="fc:frame:button:1" content="1" />
      <meta property="fc:frame:button:1:action" content="link" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toEqual([]);
    expect(reporter.toObject()).toEqual({
      "fc:frame:button:1:target": [
        {
          level: "error",
          message: "Missing button target url",
          source: "farcaster",
        },
      ],
    });
  });

  it.each(["link", "post", "post_redirect"])(
    "fails to parse %s button with invalid target url",
    (action) => {
      const document = load(`
        <meta property="fc:frame:button:1" content="1" />
        <meta property="fc:frame:button:1:action" content="${action}" />
        <meta property="fc:frame:button:1:target" content="invalid" />
      `);

      expect(parseButtons(document, reporter, "fc:frame:button")).toEqual([]);
      expect(reporter.toObject()).toEqual({
        "fc:frame:button:1:target": [
          { level: "error", message: "Invalid URL", source: "farcaster" },
        ],
      });
    }
  );

  it("fails to parse mint button with invalid CAIP-10 url as target", () => {
    const document = load(`
      <meta property="fc:frame:button:1" content="1" />
      <meta property="fc:frame:button:1:action" content="mint" />
      <meta property="fc:frame:button:1:target" content="invalid" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toEqual([]);
    expect(reporter.toObject()).toEqual({
      "fc:frame:button:1:target": [
        { level: "error", message: "Invalid CAIP-10 URL", source: "farcaster" },
      ],
    });
  });

  it("parses mint button with valid CAIP-10 url", () => {
    const document = load(`
      <meta property="fc:frame:button:1" content="1" />
      <meta property="fc:frame:button:1:action" content="mint" />
      <meta property="fc:frame:button:1:target" content="eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toEqual([
      {
        label: "1",
        action: "mint",
        target: "eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
      },
    ]);
    expect(reporter.toObject()).toEqual({});
  });

  it.each(["link", "post", "post_redirect"])("parses %s button", (action) => {
    const document = load(`
        <meta property="fc:frame:button:1" content="1" />
        <meta property="fc:frame:button:1:action" content="${action}" />
        <meta property="fc:frame:button:1:target" content="http://example.com" />
      `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toEqual([
      {
        label: "1",
        action,
        target: "http://example.com",
      },
    ]);
    expect(reporter.toObject()).toEqual({});
  });

  it.each(["post", "post_redirect"])(
    "fails to parse %s button without target",
    (action) => {
      const document = load(`
        <meta property="fc:frame:button:1" content="1" />
        <meta property="fc:frame:button:1:action" content="${action}" />
      `);

      expect(parseButtons(document, reporter, "fc:frame:button")).toEqual([
        {
          action,
          label: "1",
          target: undefined,
        },
      ]);
    }
  );

  it("parses tx button with target url only", () => {
    const document = load(`
      <meta property="fc:frame:button:1" content="1" />
      <meta property="fc:frame:button:1:action" content="tx" />
      <meta property="fc:frame:button:1:target" content="http://example.com" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toEqual([
      {
        label: "1",
        action: "tx",
        target: "http://example.com",
      },
    ]);
    expect(reporter.toObject()).toEqual({});
  });

  it("parses tx button with target url and post_url", () => {
    const document = load(`
      <meta property="fc:frame:button:1" content="1" />
      <meta property="fc:frame:button:1:action" content="tx" />
      <meta property="fc:frame:button:1:target" content="http://example.com" />
      <meta property="fc:frame:button:1:post_url" content="http://example.com/post" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toEqual([
      {
        label: "1",
        action: "tx",
        target: "http://example.com",
        post_url: "http://example.com/post",
      },
    ]);
    expect(reporter.toObject()).toEqual({});
  });

  it("parses 4 buttons", () => {
    const document = load(`
      <meta property="fc:frame:button:1" content="1" />
      <meta property="fc:frame:button:1:action" content="link" />
      <meta property="fc:frame:button:1:target" content="http://example.com" />
      <meta property="fc:frame:button:2" content="2" />
      <meta property="fc:frame:button:2:action" content="post" />
      <meta property="fc:frame:button:3" content="3" />
      <meta property="fc:frame:button:3:action" content="post_redirect" />
      <meta property="fc:frame:button:4" content="4" />
      <meta property="fc:frame:button:4:action" content="tx" />
      <meta property="fc:frame:button:4:target" content="http://example.com" />
    `);

    expect(parseButtons(document, reporter, "fc:frame:button")).toEqual([
      {
        label: "1",
        action: "link",
        target: "http://example.com",
      },
      {
        label: "2",
        action: "post",
        target: undefined,
      },
      {
        label: "3",
        action: "post_redirect",
        target: undefined,
      },
      {
        label: "4",
        action: "tx",
        target: "http://example.com",
      },
    ]);
    expect(reporter.toObject()).toEqual({});
  });
});

describe("validateFrameImage", () => {
  it("fails if invalid url", () => {
    expect(() => validateFrameImage("invalid")).toThrow("Invalid URL");
  });

  it("fails if invalid protocol", () => {
    expect(() => validateFrameImage("ftp://test.com")).toThrow(
      'Invalid image URL. Only "http", "https" and "data" protocols are allowed'
    );
  });

  it("fails if invalid data url mime type", () => {
    expect(() => validateFrameImage("data:invalid;base64,")).toThrow(
      'Invalid image URL. Only "image/png", "image/jpg", "image/jpeg" and "image/gif" MIME types are allowed'
    );
  });

  it("fails if data url length is exceeding 256KB", () => {
    expect(() =>
      validateFrameImage(`data:image/png;base64,${"A".repeat(256 * 1024)}`)
    ).toThrow("Image size exceeds 256KB");
  });

  it("returns the image url if valid", () => {
    expect(validateFrameImage("http://example.com")).toBe(
      "http://example.com/"
    );
  });

  it.each(["image/jpeg", "image/png", "image/gif", "image/jpg"])(
    "returns data url with %s content type",
    (contentType) => {
      expect(
        validateFrameImage(`data:${contentType};base64,${"A".repeat(10)}`)
      ).toBe(`data:${contentType};base64,${"A".repeat(10)}`);
    }
  );
});

describe("validateInputText", () => {
  it("fails if input text exceeds 32 bytes", () => {
    expect(() => validateInputText("a".repeat(1001))).toThrow(
      "Invalid input text. Text size exceeds 32 bytes limit"
    );
  });

  it("returns the input text if valid", () => {
    expect(validateInputText("test")).toBe("test");
  });
});

describe("validateAspectRatio", () => {
  it("fails if invalid aspect ratio", () => {
    expect(() => validateAspectRatio("invalid")).toThrow(
      "Invalid image aspect ratio"
    );
  });

  it("returns the aspect ratio if valid", () => {
    expect(validateAspectRatio("1:1")).toBe("1:1");
  });
});

describe("validateState", () => {
  it("fails if state size exceeds 4KB", () => {
    expect(() => validateState("A".repeat(4097))).toThrow(
      "Invalid state. State size exceeds 4096 bytes limit"
    );
  });

  it("returns the state if valid", () => {
    expect(validateState("state")).toBe("state");
  });
});

describe("validateUrl", () => {
  it("fails if invalid url", () => {
    expect(() => validateUrl("invalid", false)).toThrow("Invalid URL");
  });

  it("fails if url excdeeds allowed maximum length", () => {
    expect(() =>
      validateUrl(`http://example.com/${"a".repeat(10)}`, 10)
    ).toThrow(
      "Invalid URL. URL size exceeds 10 bytes limit (frames.js generates a longer post_url including system params)."
    );
  });

  it("returns the url if valid", () => {
    expect(validateUrl("http://example.com", false)).toBe(
      "http://example.com/"
    );
  });
});
