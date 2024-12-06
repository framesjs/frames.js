/* eslint-disable @typescript-eslint/no-explicit-any -- tests */
/* eslint-disable @typescript-eslint/no-unsafe-assignment -- tests */
import { load } from "cheerio";
import nock, { disableNetConnect, enableNetConnect, cleanAll } from "nock";
import type { PartialDeep } from "type-fest";
import type { FrameV2 } from "../types";
import type { FarcasterManifest } from "../farcaster-v2/types";
import { parseFarcasterFrameV2 } from "./farcasterV2";
import { createReporter } from "./reporter";

const frameUrl = "https://framesjs.org/my/frame/v2";

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

    cleanAll();
    disableNetConnect();
  });

  afterEach(() => {
    enableNetConnect();
  });

  it("does not support farcaster v1 metatags", async () => {
    const document = load(`
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="http://example.com/image.png" />
      <meta property="og:image" content="http://example.com/image.png" />
      <title>Test</title>
    `);

    await expect(
      parseFarcasterFrameV2(document, { frameUrl, reporter })
    ).resolves.toMatchObject({
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

  it('parses frame from "fc:frame" meta tag', async () => {
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

    await expect(
      parseFarcasterFrameV2(document, { frameUrl, reporter })
    ).resolves.toEqual({
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

  it("fails on missing version", async () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        ...validFrame,
        version: undefined,
      } satisfies PartialDeep<FrameV2>)}' />
      <title>Test</title>
    `);

    const { version: _, ...restOfFrame } = validFrame;

    await expect(
      parseFarcasterFrameV2(document, { frameUrl, reporter })
    ).resolves.toMatchObject({
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

  it.each([1, true, null])(
    "fails to parse non string version",
    async (version) => {
      const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        ...validFrame,
        version: version as any,
      } satisfies PartialDeep<FrameV2>)}' />
      <title>Test</title>
    `);

      const { version: _, ...restOfFrame } = validFrame;

      await expect(
        parseFarcasterFrameV2(document, { frameUrl, reporter })
      ).resolves.toMatchObject({
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
    }
  );

  it("fails on missing imageUrl", async () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        ...validFrame,
        imageUrl: undefined,
      } satisfies PartialDeep<FrameV2>)}' />
      <title>Test</title>
    `);

    const { imageUrl: _, ...restOfFrame } = validFrame;

    await expect(
      parseFarcasterFrameV2(document, { frameUrl, reporter })
    ).resolves.toMatchObject({
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

  it.each([1, true, null])(
    "fails to parse non string imageUrl",
    async (imageUrl) => {
      const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        ...validFrame,
        imageUrl: imageUrl as any,
      } satisfies PartialDeep<FrameV2>)}' />
      <title>Test</title>
    `);

      const { imageUrl: _, ...restOfFrame } = validFrame;

      await expect(
        parseFarcasterFrameV2(document, { frameUrl, reporter })
      ).resolves.toMatchObject({
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
    }
  );

  it("fails on invalid URL in imageUrl", async () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify({
        ...validFrame,
        imageUrl: "not a url",
      } satisfies PartialDeep<FrameV2>)}' />
      <title>Test</title>
    `);

    const { imageUrl: _, ...restOfFrame } = validFrame;

    await expect(
      parseFarcasterFrameV2(document, { frameUrl, reporter })
    ).resolves.toMatchObject({
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
    it("fails on missing title", async () => {
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

      await expect(
        parseFarcasterFrameV2(document, { frameUrl, reporter })
      ).resolves.toMatchObject({
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

    it.each([1, true, null])(
      "fails to parse non string title",
      async (title) => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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
      }
    );

    describe("action", () => {
      it("fails on missing name", async () => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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

      it.each([1, true, null])(
        "fails to parse non string name",
        async (name) => {
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

          await expect(
            parseFarcasterFrameV2(document, { frameUrl, reporter })
          ).resolves.toMatchObject({
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
        }
      );

      it("fails on missing type", async () => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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

      it.each([1, true, null])(
        "fails to parse non string type",
        async (type) => {
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

          await expect(
            parseFarcasterFrameV2(document, { frameUrl, reporter })
          ).resolves.toMatchObject({
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
        }
      );

      it('fails on invalid type, must be "launch_frame"', async () => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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

      it("fails on missing url", async () => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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

      it.each([1, true, null])("fails to parse non string url", async (url) => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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

      it("fails if url is not valid URL", async () => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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

      it('fails on missing "splashImageUrl"', async () => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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
        async (splashImageUrl) => {
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

          await expect(
            parseFarcasterFrameV2(document, { frameUrl, reporter })
          ).resolves.toMatchObject({
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

      it('fails on invalid "splashImageUrl" URL', async () => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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

      it('fails on missing "splashBackgroundColor"', async () => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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
        async (splashBackgroundColor) => {
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

          await expect(
            parseFarcasterFrameV2(document, { frameUrl, reporter })
          ).resolves.toMatchObject({
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

      it('fails on invalid "splashBackgroundColor" color', async () => {
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

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter })
        ).resolves.toMatchObject({
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

  describe("manifest", () => {
    it("does not parse manifest by default", async () => {
      const document = load(`
        <meta property="fc:frame" content='${JSON.stringify(validFrame)}' />
        <title>Test</title>
      `);

      await expect(
        parseFarcasterFrameV2(document, { frameUrl, reporter })
      ).resolves.toMatchObject({
        status: "success",
        specification: "farcaster_v2",
        frame: validFrame,
        reports: {},
        manifest: undefined,
      });
    });
  });

  it("fails parsing manifest if the response is not ok", async () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify(validFrame)}' />
      <title>Test</title>
    `);

    nock("https://framesjs.org").get("/.well-known/farcaster.json").reply(404);

    await expect(
      parseFarcasterFrameV2(document, {
        frameUrl,
        reporter,
        parseManifest: true,
      })
    ).resolves.toMatchObject({
      status: "success",
      manifest: {
        status: "failure",
        manifest: {},
        reports: {
          "fc:manifest": [
            {
              level: "error",
              message: "Failed to fetch frame manifest, status code: 404",
              source: "farcaster_v2",
            },
          ],
        },
      },
    });
  });

  it("fails parsing manifest if the response is not valid JSON", async () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify(validFrame)}' />
      <title>Test</title>
    `);

    nock("https://framesjs.org")
      .get("/.well-known/farcaster.json")
      .reply(200, "not a json");

    await expect(
      parseFarcasterFrameV2(document, {
        frameUrl,
        reporter,
        parseManifest: true,
      })
    ).resolves.toMatchObject({
      status: "success",
      manifest: {
        status: "failure",
        manifest: {},
        reports: {
          "fc:manifest": [
            {
              level: "error",
              message:
                "Failed to parse frame manifest, it is not a valid JSON value",
              source: "farcaster_v2",
            },
          ],
        },
      },
    });
  });

  it("fails parsing manifest if frame config is invalid", async () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify(validFrame)}' />
      <title>Test</title>
    `);

    nock("https://framesjs.org")
      .get("/.well-known/farcaster.json")
      .reply(
        200,
        JSON.stringify({
          accountAssociation: {
            header: "test",
          },
          triggers: [
            {
              type: "invalid",
            },
          ],
        })
      );

    await expect(
      parseFarcasterFrameV2(document, {
        frameUrl,
        reporter,
        parseManifest: true,
      })
    ).resolves.toMatchObject({
      status: "success",
      manifest: {
        status: "failure",
        manifest: {
          accountAssociation: {
            header: "test",
          },
        },
        reports: {
          "fc:manifest.accountAssociation.payload": [
            {
              level: "error",
              message:
                'Missing required property "payload" in account association',
              source: "farcaster_v2",
            },
          ],
          "fc:manifest.accountAssociation.signature": [
            {
              level: "error",
              message:
                'Missing required property "signature" in account association',
              source: "farcaster_v2",
            },
          ],
          "fc:manifest": [
            {
              level: "error",
              message: 'Missing required property "frame" in manifest',
              source: "farcaster_v2",
            },
          ],
          "fc:manifest.triggers[0].type": [
            {
              level: "error",
              message: "Trigger type must be either 'cast' or 'composer'",
              source: "farcaster_v2",
            },
          ],
        },
      },
    });
  });

  it("fails validation if signature is not associated with the domain", async () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify(validFrame)}' />
      <title>Test</title>
    `);

    enableNetConnect("mainnet.optimism.io:443");

    nock("https://non-framesjs.org")
      .get("/.well-known/farcaster.json")
      .reply(
        200,
        JSON.stringify({
          accountAssociation: {
            header:
              "eyJmaWQiOjM0MTc5NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDc4Mzk3RDlEMTg1RDNhNTdEMDEyMTNDQmUzRWMxRWJBQzNFRWM3N2QifQ",
            payload: "eyJkb21haW4iOiJmcmFtZXNqcy5vcmcifQ",
            signature:
              "MHgwOWExNWMyZDQ3ZDk0NTM5NWJjYTJlNGQzNDg3MzYxMGUyNGZiMDFjMzc0NTUzYTJmOTM2NjM3YjU4YTA5NzdjNzAxOWZiYzljNGUxY2U5ZmJjOGMzNWVjYTllNzViMTM5Zjg3ZGQyNTBlMzhkMjBmM2YyZmEyNDk2MDQ1NGExMjFi",
          },
          frame: {
            homeUrl: "https://framesjs.org",
            iconUrl: "https://framesjs.org/logo.png",
            name: "App name",
            version: "next",
          },
        } satisfies FarcasterManifest)
      );

    await expect(
      parseFarcasterFrameV2(document, {
        frameUrl: "https://non-framesjs.org/my/frame/v2",
        reporter,
        parseManifest: true,
      })
    ).resolves.toMatchObject({
      status: "success",
      manifest: {
        status: "failure",
        manifest: {},
        reports: {},
      },
    });
  });

  it("parses valid manifest", async () => {
    const document = load(`
      <meta property="fc:frame" content='${JSON.stringify(validFrame)}' />
      <title>Test</title>
    `);

    enableNetConnect("mainnet.optimism.io:443");

    nock("https://framesjs.org")
      .get("/.well-known/farcaster.json")
      .reply(
        200,
        JSON.stringify({
          accountAssociation: {
            header:
              "eyJmaWQiOjM0MTc5NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDc4Mzk3RDlEMTg1RDNhNTdEMDEyMTNDQmUzRWMxRWJBQzNFRWM3N2QifQ",
            payload: "eyJkb21haW4iOiJmcmFtZXNqcy5vcmcifQ",
            signature:
              "MHgwOWExNWMyZDQ3ZDk0NTM5NWJjYTJlNGQzNDg3MzYxMGUyNGZiMDFjMzc0NTUzYTJmOTM2NjM3YjU4YTA5NzdjNzAxOWZiYzljNGUxY2U5ZmJjOGMzNWVjYTllNzViMTM5Zjg3ZGQyNTBlMzhkMjBmM2YyZmEyNDk2MDQ1NGExMjFi",
          },
          frame: {
            homeUrl: "https://framesjs.org",
            iconUrl: "https://framesjs.org/logo.png",
            name: "App name",
            version: "next",
          },
        } satisfies FarcasterManifest)
      );

    await expect(
      parseFarcasterFrameV2(document, {
        frameUrl: "https://framesjs.org/my/frame/v2",
        reporter,
        parseManifest: true,
      })
    ).resolves.toMatchObject({
      status: "success",
      manifest: {
        status: "success",
        manifest: {
          accountAssociation: {
            header:
              "eyJmaWQiOjM0MTc5NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDc4Mzk3RDlEMTg1RDNhNTdEMDEyMTNDQmUzRWMxRWJBQzNFRWM3N2QifQ",
            payload: "eyJkb21haW4iOiJmcmFtZXNqcy5vcmcifQ",
            signature:
              "MHgwOWExNWMyZDQ3ZDk0NTM5NWJjYTJlNGQzNDg3MzYxMGUyNGZiMDFjMzc0NTUzYTJmOTM2NjM3YjU4YTA5NzdjNzAxOWZiYzljNGUxY2U5ZmJjOGMzNWVjYTllNzViMTM5Zjg3ZGQyNTBlMzhkMjBmM2YyZmEyNDk2MDQ1NGExMjFi",
          },
          frame: {
            homeUrl: "https://framesjs.org",
            iconUrl: "https://framesjs.org/logo.png",
            name: "App name",
            version: "next",
          },
        },
        reports: {},
      },
    });
  });
});
