import assert from "assert";
import { ImageResponse } from "@vercel/og";
import { ImageResponseOptions } from "next/server";
import { getFrameMessage } from "frames.js/next/server";
import { FrameActionDataParsedAndHubContext } from "frames.js";

/** A subset of JS objects that are serializable */
export type AnyJson = boolean | number | string | null | JsonArray | JsonMap;
export interface JsonMap {
  [key: string]: AnyJson;
}
interface JsonArray extends Array<AnyJson> {}

interface IFrameImage {
  renderToMetaTag(): Promise<string>;
}

export class Frame {
  private image: IFrameImage | undefined;
  private buttons: IFrameButton[] = [];
  /**
   * This is frame state coming from Button no the global app state comming from FramesApp
   */
  private state: AnyJson | undefined = undefined;

  getState() {
    return this.state;
  }

  setState(state: AnyJson | undefined) {
    this.state = state;
  }

  registerImage(
    definitionOrURL: React.ReactElement | string | URL
  ): IFrameImage {
    if (
      typeof definitionOrURL === "object" &&
      !(definitionOrURL instanceof URL)
    ) {
      return (this.image = new FrameImage(definitionOrURL));
    }

    return (this.image = new FrameImageURL(new URL(definitionOrURL)));
  }

  registerPostButton(path: `/${string}`, label: string): FramePostButton {
    if (this.buttons.length >= 4) {
      throw new Error("Maximum number of buttons is 4");
    }

    const button = new FramePostButton(
      path,
      (this.buttons.length + 1) as AllowedButtonIndexes,
      label
    );

    this.buttons.push(button);

    return button;
  }

  registerExternalLinkButton(href: URL, label: string): FrameExternalButton {
    if (this.buttons.length >= 4) {
      throw new Error("Maximum number of buttons is 4");
    }

    const button = new FrameExternalButton(
      href,
      (this.buttons.length + 1) as AllowedButtonIndexes,
      label
    );

    this.buttons.push(button);

    return button;
  }

  async toHTML(app: FramesApp): Promise<string> {
    assert(this.image, "Frame image is not set");

    return `
      <!DOCTYPE html>
      <html> 
        <head>
          <meta name="fc:frame" content="vNext" />
          ${await this.image.renderToMetaTag()}
          <meta name="fc:frame:state" content="${JSON.stringify(app.getState())}" />
        </head>
        <body></body>
      </html>
    `.trim();
  }
}

type AllowedButtonIndexes = 1 | 2 | 3 | 4;

interface IFrameButton {
  renderToMetaTag(): string;
}

class FrameExternalButton implements IFrameButton {
  private href: URL | undefined;
  private index: AllowedButtonIndexes | undefined;
  private label: string | undefined;

  constructor(href: URL, index: AllowedButtonIndexes, label: string) {
    this.href = href;
    this.index = index;
    this.label = label;
  }

  renderToMetaTag() {
    assert(this.href, "Button href is not set");
    assert(this.index, "Button index is not set");
    assert(this.label, "Button label is not set");

    return `
      <meta name="fc:frame:button:${this.index}" content="${this.label}" />
      <meta name="fc:frame:button:${this.index}:action" content="link" />
      <meta name="fc:frame:button:${this.index}:target" content="${this.href.toString()}" />
    `.trim();
  }
}

class FramePostButton implements IFrameButton {
  private path: `/${string}` | undefined;
  private index: AllowedButtonIndexes | undefined;
  private label: string | undefined;

  constructor(path: `/${string}`, index: AllowedButtonIndexes, label: string) {
    this.path = path;
    this.index = index;
    this.label = label;
  }

  renderToMetaTag(): string {
    assert(this.path, "Button path is not set");
    assert(this.index, "Button index is not set");
    assert(this.label, "Button label is not set");

    return `
      <meta name="fc:frame:button:${this.index}" content="${this.label}" />
      <meta name="fc:frame:button:${this.index}:action" content="post" />
      <meta name="fc:frame:button:${this.index}:target" content="${this.path}" />
    `.trim();
  }
}

export class FrameImageURL implements IFrameImage {
  private url: URL;

  constructor(url: URL) {
    this.url = url;
  }

  async renderToMetaTag(): Promise<string> {
    return `
    <meta name="fc:frame:image" content="data:image/png;base64,${this.url.toString()}" />
    <meta property="og:image" content="data:image/png;base64,${this.url.toString()}" />
    `.trim();
  }
}

export class FrameImage implements IFrameImage {
  private definition: React.ReactElement;
  private options: ImageResponseOptions | undefined;

  constructor(definition: React.ReactElement, options?: ImageResponseOptions) {
    this.definition = definition;
    this.options = options;
  }

  async renderToMetaTag(): Promise<string> {
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            display: "flex", // Use flex layout
            flexDirection: "row", // Align items horizontally
            alignItems: "stretch", // Stretch items to fill the container height
            width: "100%",
            height: "100vh", // Full viewport height
            backgroundColor: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              lineHeight: 1.2,
              fontSize: 36,
              color: "black",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {this.definition}
          </div>
        </div>
      ),
      this.options
    );
    const base64 = Buffer.from(await imageResponse.arrayBuffer()).toString(
      "base64"
    );

    return `
      <meta name="fc:frame:image" content="data:image/png;base64,${base64}" />
      <meta property="og:image" content="data:image/png;base64,${base64}" />
    `.trim();
  }
}

export class FramesApp {
  private state: JsonMap = {};
  private frames: Record<`/${string}`, Frame> = {};
  private frameMessage: FrameActionDataParsedAndHubContext | null = null;

  setInitialState(state: JsonMap) {
    this.state = state;
    return this;
  }

  getState() {
    return this.state;
  }

  getFrameMessage() {
    return this.frameMessage;
  }

  registerFrame(path: `/${string}`) {
    if (this.frames[path]) {
      throw new Error(`Frame with path ${path} already exists`);
    }

    return (this.frames[path] = new Frame());
  }

  async renderToResponse(req: Request) {
    const path = new URL(req.url).pathname as `/${string}`;

    // @TODO if the request method is POST try to decode the frame message if any
    // and set the state to detected state from message

    // this is just naive implementation to show the idea
    if (!this.frames[path]) {
      return new Response("Not Found", { status: 404 });
    }

    // extract frame message if POST request with JSON body
    if (req.method === "POST") {
      try {
        // set as property, this is cleared after request
        this.frameMessage = await getFrameMessage(await req.json());
      } catch (e) {
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    try {
      const frame = this.frames[path]!;

      try {
        // extract frameState from searchParams and pass it to frame
        const frameState = new URL(req.url).searchParams.get("_fs");
        frame.setState(frameState ? JSON.parse(frameState) : undefined);
      } catch {}

      const html = await frame.toHTML(this);

      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    } catch (e) {
      return new Response("Internal Server Error", { status: 500 });
    } finally {
      this.frameMessage = null;
    }
  }
}
