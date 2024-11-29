/* eslint-disable @typescript-eslint/no-explicit-any -- tests */
/* eslint-disable @typescript-eslint/no-unsafe-assignment -- tests */
import { load } from "cheerio";
import type { PartialDeep } from "type-fest";
import type { FrameV2 } from "../types";
import { parseFarcasterFrameV2 } from "./farcasterV2";
import { createReporter } from "./reporter";

const validFrame: FrameV2 = {
  button: {
    action: {
      name: "App name",
      splashBackgroundColor: "#000000",
      splashImageUrl: "https://framesjs.org/logo.png",
      url: "https://framesjs.org",
      type: "launch_frame",
    },
    title: "Button title",
  },
  imageUrl: "https://framesjs.org/logo.png",
  version: "next",
};

describe("farcaster frame v2 parser", () => {
  let reporter = createReporter("farcaster_v2");

  beforeEach(() => {
    reporter = createReporter("farcaster_v2");
  });

  it("does not support farcaster v1 metatags", () => {
    const document = load(`
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="http://example.com/image.png" />
      <meta property="og:image" content="http://example.com/image.png" />
      <title>Test</title>
    `);

    expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
      status: "failure",
      specification: "farcaster_v2",
      reports: {
        "fc:frame": [
          {
            level: "error",
            source: "farcaster_v2",
            message: "Failed to parse Frame, it is not a valid JSON value",
          },
        ],
      },
      frame: {},
    });
  });

  it('parses frame from "fc:frame" meta tag', () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        button: {
          action: {
            name: "App name",
            splashBackgroundColor: "#000000",
            splashImageUrl: "https://framesjs.org/logo.png",
            url: "https://framesjs.org",
            type: "launch_frame",
          },
          title: "Button title",
        },
        imageUrl: "https://framesjs.org/logo.png",
        version: "next",
      } satisfies FrameV2)}' />
      <title>Test</title>
    `);

    expect(parseFarcasterFrameV2(document, { reporter })).toEqual({
      status: "success",
      specification: "farcaster_v2",
      frame: {
        version: "next",
        imageUrl: "https://framesjs.org/logo.png",
        button: {
          action: {
            name: "App name",
            splashBackgroundColor: "#000000",
            splashImageUrl: "https://framesjs.org/logo.png",
            url: "https://framesjs.org",
            type: "launch_frame",
          },
          title: "Button title",
        },
      },
      reports: {},
    });
  });

  it("fails on missing version", () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        ...validFrame,
        version: undefined,
      } satisfies PartialDeep<FrameV2>)}' />
      <title>Test</title>
    `);

    const { version: _, ...restOfFrame } = validFrame;

    expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
      status: "failure",
      specification: "farcaster_v2",
      frame: {
        ...restOfFrame,
      },
      reports: {
        "fc:frame": [
          {
            source: "farcaster_v2",
            level: "error",
            message: 'Missing required key "version" in Frame',
          },
        ],
      },
    });
  });

  it.each([1, true, null])("fails to parse non string version", (version) => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        ...validFrame,
        version: version as any,
      } satisfies PartialDeep<FrameV2>)}' />
      <title>Test</title>
    `);

    const { version: _, ...restOfFrame } = validFrame;

    expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
      status: "failure",
      specification: "farcaster_v2",
      frame: {
        ...restOfFrame,
      },
      reports: {
        "fc:frame": [
          {
            source: "farcaster_v2",
            level: "error",
            message: 'Key "version" in Frame must be a string',
          },
        ],
      },
    });
  });

  it("fails on missing imageUrl", () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        ...validFrame,
        imageUrl: undefined,
      } satisfies PartialDeep<FrameV2>)}' />
      <title>Test</title>
    `);

    const { imageUrl: _, ...restOfFrame } = validFrame;

    expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
      status: "failure",
      specification: "farcaster_v2",
      frame: {
        ...restOfFrame,
      },
      reports: {
        "fc:frame": [
          {
            source: "farcaster_v2",
            level: "error",
            message: 'Missing required key "imageUrl" in Frame',
          },
        ],
      },
    });
  });

  it.each([1, true, null])("fails to parse non string imageUrl", (imageUrl) => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        ...validFrame,
        imageUrl: imageUrl as any,
      } satisfies PartialDeep<FrameV2>)}' />
      <title>Test</title>
    `);

    const { imageUrl: _, ...restOfFrame } = validFrame;

    expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
      status: "failure",
      specification: "farcaster_v2",
      frame: {
        ...restOfFrame,
      },
      reports: {
        "fc:frame": [
          {
            source: "farcaster_v2",
            level: "error",
            message: 'Key "imageUrl" in Frame must be a string',
          },
        ],
      },
    });
  });

  it("fails on invalid URL in imageUrl", () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        ...validFrame,
        imageUrl: "not a url",
      } satisfies PartialDeep<FrameV2>)}' />
      <title>Test</title>
    `);

    const { imageUrl: _, ...restOfFrame } = validFrame;

    expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
      status: "failure",
      specification: "farcaster_v2",
      frame: {
        ...restOfFrame,
      },
      reports: {
        "fc:frame": [
          {
            source: "farcaster_v2",
            level: "error",
            message: 'Key "imageUrl" in Frame must be a valid URL',
          },
        ],
      },
    });
  });

  describe("button", () => {
    it("fails on missing title", () => {
      const document = load(`
        <meta property="fc:frame" content='${JSON.stringify({
          ...validFrame,
          button: {
            ...validFrame.button,
            title: undefined,
          },
        } satisfies PartialDeep<FrameV2>)}' />
        <title>Test</title>
      `);

      const {
        button: { title: _, ...restOfButton },
        ...restOfFrame
      } = validFrame;

      expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
        status: "failure",
        specification: "farcaster_v2",
        frame: {
          ...restOfFrame,
          button: {
            ...restOfButton,
          },
        },
        reports: {
          "fc:frame": [
            {
              source: "farcaster_v2",
              level: "error",
              message: 'Missing required key "title" in Frame.button',
            },
          ],
        },
      });
    });

    it.each([1, true, null])("fails to parse non string title", (title) => {
      const document = load(`
        <meta property="fc:frame" content='${JSON.stringify({
          ...validFrame,
          button: {
            ...validFrame.button,
            title: title as any,
          },
        } satisfies PartialDeep<FrameV2>)}' />
        <title>Test</title>
      `);

      const {
        button: { title: _, ...restOfButton },
        ...restOfFrame
      } = validFrame;

      expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
        status: "failure",
        specification: "farcaster_v2",
        frame: {
          ...restOfFrame,
          button: {
            ...restOfButton,
          },
        },
        reports: {
          "fc:frame": [
            {
              source: "farcaster_v2",
              level: "error",
              message: 'Key "title" in Frame.button must be a string',
            },
          ],
        },
      });
    });

    describe("action", () => {
      it("fails on missing name", () => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                name: undefined,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { name: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message: 'Missing required key "name" in Frame.button.action',
              },
            ],
          },
        });
      });

      it.each([1, true, null])("fails to parse non string name", (name) => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                name: name as any,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { name: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message: 'Key "name" in Frame.button.action must be a string',
              },
            ],
          },
        });
      });

      it("fails on missing type", () => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                type: undefined,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { type: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message: 'Missing required key "type" in Frame.button.action',
              },
            ],
          },
        });
      });

      it.each([1, true, null])("fails to parse non string type", (type) => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                type: type as any,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { type: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message: 'Key "type" in Frame.button.action must be a string',
              },
            ],
          },
        });
      });

      it('fails on invalid type, must be "launch_frame"', () => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                type: "invalid" as any,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { type: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message:
                  'Key "type" in Frame.button.action must be "launch_frame"',
              },
            ],
          },
        });
      });

      it("fails on missing url", () => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                url: undefined,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { url: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message: 'Missing required key "url" in Frame.button.action',
              },
            ],
          },
        });
      });

      it.each([1, true, null])("fails to parse non string url", (url) => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                url: url as any,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { url: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message: 'Key "url" in Frame.button.action must be a string',
              },
            ],
          },
        });
      });

      it("fails if url is not valid URL", () => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                url: "not a url",
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { url: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message: 'Key "url" in Frame.button.action must be a valid URL',
              },
            ],
          },
        });
      });

      it('fails on missing "splashImageUrl"', () => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                splashImageUrl: undefined,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { splashImageUrl: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message:
                  'Missing required key "splashImageUrl" in Frame.button.action',
              },
            ],
          },
        });
      });

      it.each([1, true, null])(
        'fails to parse non string "splashImageUrl"',
        (splashImageUrl) => {
          const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                splashImageUrl: splashImageUrl as any,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

          const {
            button: {
              action: { splashImageUrl: _, ...restOfAction },
              ...restOfButton
            },
            ...restOfFrame
          } = validFrame;

          expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
            status: "failure",
            specification: "farcaster_v2",
            frame: {
              ...restOfFrame,
              button: {
                ...restOfButton,
                action: {
                  ...restOfAction,
                },
              },
            },
            reports: {
              "fc:frame": [
                {
                  source: "farcaster_v2",
                  level: "error",
                  message:
                    'Key "splashImageUrl" in Frame.button.action must be a string',
                },
              ],
            },
          });
        }
      );

      it('fails on invalid "splashImageUrl" URL', () => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                splashImageUrl: "not a url",
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { splashImageUrl: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message:
                  'Key "splashImageUrl" in Frame.button.action must be a valid URL',
              },
            ],
          },
        });
      });

      it('fails on missing "splashBackgroundColor"', () => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                splashBackgroundColor: undefined,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { splashBackgroundColor: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message:
                  'Missing required key "splashBackgroundColor" in Frame.button.action',
              },
            ],
          },
        });
      });

      it.each([1, true, null])(
        'fails to parse non string "splashBackgroundColor"',
        (splashBackgroundColor) => {
          const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                splashBackgroundColor: splashBackgroundColor as any,
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

          const {
            button: {
              action: { splashBackgroundColor: _, ...restOfAction },
              ...restOfButton
            },
            ...restOfFrame
          } = validFrame;

          expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
            status: "failure",
            specification: "farcaster_v2",
            frame: {
              ...restOfFrame,
              button: {
                ...restOfButton,
                action: {
                  ...restOfAction,
                },
              },
            },
            reports: {
              "fc:frame": [
                {
                  source: "farcaster_v2",
                  level: "error",
                  message:
                    'Key "splashBackgroundColor" in Frame.button.action must be a string',
                },
              ],
            },
          });
        }
      );

      it('fails on invalid "splashBackgroundColor" color', () => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            button: {
              ...validFrame.button,
              action: {
                ...validFrame.button.action,
                splashBackgroundColor: "not a color",
              },
            },
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        const {
          button: {
            action: { splashBackgroundColor: _, ...restOfAction },
            ...restOfButton
          },
          ...restOfFrame
        } = validFrame;

        expect(parseFarcasterFrameV2(document, { reporter })).toMatchObject({
          status: "failure",
          specification: "farcaster_v2",
          frame: {
            ...restOfFrame,
            button: {
              ...restOfButton,
              action: {
                ...restOfAction,
              },
            },
          },
          reports: {
            "fc:frame": [
              {
                source: "farcaster_v2",
                level: "error",
                message:
                  'Key "splashBackgroundColor" in Frame.button.action must be a valid hex color',
              },
            ],
          },
        });
      });
    });
  });
});
