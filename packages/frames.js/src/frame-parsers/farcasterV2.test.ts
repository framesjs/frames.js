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
        "fc:frame.version": [
          {
            source: "farcaster_v2",
            level: "error",
            message: 'Invalid literal value, expected "next"',
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
          "fc:frame.version": [
            {
              source: "farcaster_v2",
              level: "error",
              message: 'Invalid literal value, expected "next"',
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
        "fc:frame.imageUrl": [
          {
            source: "farcaster_v2",
            level: "error",
            message: "Required",
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
          "fc:frame.imageUrl": [
            {
              source: "farcaster_v2",
              level: "error",
              message: expect.stringMatching("Expected string, received"),
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
        "fc:frame.imageUrl": [
          {
            source: "farcaster_v2",
            level: "error",
            message: "Invalid url",
          },
          {
            source: "farcaster_v2",
            level: "error",
            message: "Must be an https url",
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
          "fc:frame.button.title": [
            {
              source: "farcaster_v2",
              level: "error",
              message: "Required",
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
            "fc:frame.button.title": [
              {
                source: "farcaster_v2",
                level: "error",
                message: expect.stringMatching("Expected string, received"),
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
            "fc:frame.button.action.name": [
              {
                source: "farcaster_v2",
                level: "error",
                message: "Required",
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
              "fc:frame.button.action.name": [
                {
                  source: "farcaster_v2",
                  level: "error",
                  message: expect.stringMatching("Expected string, received"),
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
            "fc:frame.button.action.type": [
              {
                source: "farcaster_v2",
                level: "error",
                message: "Invalid discriminator value. Expected 'launch_frame'",
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
              "fc:frame.button.action.type": [
                {
                  source: "farcaster_v2",
                  level: "error",
                  message:
                    "Invalid discriminator value. Expected 'launch_frame'",
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
            "fc:frame.button.action.type": [
              {
                source: "farcaster_v2",
                level: "error",
                message: "Invalid discriminator value. Expected 'launch_frame'",
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
            "fc:frame.button.action.url": [
              {
                source: "farcaster_v2",
                level: "error",
                message: "Required",
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
            "fc:frame.button.action.url": [
              {
                source: "farcaster_v2",
                level: "error",
                message: expect.stringMatching("Expected string, received"),
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
            "fc:frame.button.action.url": [
              {
                source: "farcaster_v2",
                level: "error",
                message: "Invalid url",
              },
              {
                source: "farcaster_v2",
                level: "error",
                message: "Must be an https url",
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
              "fc:frame.button.action.splashImageUrl": [
                {
                  source: "farcaster_v2",
                  level: "error",
                  message: expect.stringMatching("Expected string, received"),
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
            "fc:frame.button.action.splashImageUrl": [
              {
                source: "farcaster_v2",
                level: "error",
                message: "Invalid url",
              },
              {
                source: "farcaster_v2",
                level: "error",
                message: "Must be an https url",
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
              "fc:frame.button.action.splashBackgroundColor": [
                {
                  source: "farcaster_v2",
                  level: "error",
                  message: expect.stringMatching("Expected string, received"),
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
            "fc:frame.button.action.splashBackgroundColor": [
              {
                source: "farcaster_v2",
                level: "error",
                message:
                  "Invalid hex color code. It should be in the format #RRGGBB or #RGB.",
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
              message: "Required",
              source: "farcaster_v2",
            },
          ],
          "fc:manifest.accountAssociation.signature": [
            {
              level: "error",
              message: "Required",
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

  describe("non strict mode", () => {
    describe("button", () => {
      it("returns error but keeps imageUrl if imageUrl is not https string", async () => {
        const document = load(`
          <meta property="fc:frame" content='${JSON.stringify({
            ...validFrame,
            imageUrl: "http://example.com/image.png",
          } satisfies PartialDeep<FrameV2>)}' />
          <title>Test</title>
        `);

        await expect(
          parseFarcasterFrameV2(document, { frameUrl, reporter, strict: false })
        ).resolves.toMatchObject({
          status: "success",
          specification: "farcaster_v2",
          frame: {
            ...validFrame,
            imageUrl: "http://example.com/image.png",
          },
          reports: {
            "fc:frame.imageUrl": [
              {
                source: "farcaster_v2",
                level: "warning",
                message: "Must be an https url",
              },
            ],
          },
        });
      });

      describe("action", () => {
        it("returns error but keeps url if url is not https string", async () => {
          const document = load(`
            <meta property="fc:frame" content='${JSON.stringify({
              ...validFrame,
              button: {
                ...validFrame.button,
                action: {
                  ...validFrame.button.action,
                  url: "http://example.com",
                },
              },
            } satisfies PartialDeep<FrameV2>)}' />
            <title>Test</title>
          `);

          await expect(
            parseFarcasterFrameV2(document, {
              frameUrl,
              reporter,
              strict: false,
            })
          ).resolves.toMatchObject({
            status: "success",
            specification: "farcaster_v2",
            frame: {
              ...validFrame,
              button: {
                ...validFrame.button,
                action: {
                  ...validFrame.button.action,
                  url: "http://example.com",
                },
              },
            },
            reports: {
              "fc:frame.button.action.url": [
                {
                  source: "farcaster_v2",
                  level: "warning",
                  message: "Must be an https url",
                },
              ],
            },
          });
        });

        it('returns error but keeps "splashImageUrl" if "splashImageUrl" is not https string', async () => {
          const document = load(`
            <meta property="fc:frame" content='${JSON.stringify({
              ...validFrame,
              button: {
                ...validFrame.button,
                action: {
                  ...validFrame.button.action,
                  splashImageUrl: "http://example.com",
                },
              },
            } satisfies PartialDeep<FrameV2>)}' />
            <title>Test</title>
          `);

          await expect(
            parseFarcasterFrameV2(document, {
              frameUrl,
              reporter,
              strict: false,
            })
          ).resolves.toMatchObject({
            status: "success",
            specification: "farcaster_v2",
            frame: {
              ...validFrame,
              button: {
                ...validFrame.button,
                action: {
                  ...validFrame.button.action,
                  splashImageUrl: "http://example.com",
                },
              },
            },
            reports: {
              "fc:frame.button.action.splashImageUrl": [
                {
                  source: "farcaster_v2",
                  level: "warning",
                  message: "Must be an https url",
                },
              ],
            },
          });
        });
      });
    });

    describe("manifest", () => {
      describe("frame", () => {
        it('returns an error if "homeUrl" is not an https string', async () => {
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
                  homeUrl: "http://example.com",
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
              strict: false,
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
                  homeUrl: "http://example.com",
                  iconUrl: "https://framesjs.org/logo.png",
                  name: "App name",
                  version: "next",
                },
              },
              reports: {
                "fc:manifest.frame.homeUrl": [
                  {
                    level: "warning",
                    message: "Must be an https url",
                    source: "farcaster_v2",
                  },
                ],
              },
            },
          });
        });

        it('returns an error if "iconUrl" is not an https string', async () => {
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
                  homeUrl: "https://example.com",
                  iconUrl: "http://framesjs.org/logo.png",
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
              strict: false,
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
                  homeUrl: "https://example.com",
                  iconUrl: "http://framesjs.org/logo.png",
                  name: "App name",
                  version: "next",
                },
              },
              reports: {
                "fc:manifest.frame.iconUrl": [
                  {
                    level: "warning",
                    message: "Must be an https url",
                    source: "farcaster_v2",
                  },
                ],
              },
            },
          });
        });

        it('returns an error if "splashImageUrl" is not an https string', async () => {
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
                  homeUrl: "https://example.com",
                  iconUrl: "https://framesjs.org/logo.png",
                  name: "App name",
                  version: "next",
                  splashImageUrl: "http://example.com/splash.png",
                },
              } satisfies FarcasterManifest)
            );

          await expect(
            parseFarcasterFrameV2(document, {
              frameUrl: "https://framesjs.org/my/frame/v2",
              reporter,
              parseManifest: true,
              strict: false,
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
                  homeUrl: "https://example.com",
                  iconUrl: "https://framesjs.org/logo.png",
                  splashImageUrl: "http://example.com/splash.png",
                  name: "App name",
                  version: "next",
                },
              },
              reports: {
                "fc:manifest.frame.splashImageUrl": [
                  {
                    level: "warning",
                    message: "Must be an https url",
                    source: "farcaster_v2",
                  },
                ],
              },
            },
          });
        });
      });
    });
  });
});
