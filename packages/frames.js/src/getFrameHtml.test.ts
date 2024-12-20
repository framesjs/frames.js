import { getFrame } from "./getFrame";
import { getFrameHtmlHead } from "./getFrameHtml";
import type { Frame } from "./types";

describe("getFrameHtmlHead", () => {
  it("correctly serializes JSON containing single quotes", async () => {
    const json = { test: "'><&" };
    const frame: Frame = {
      image: "https://example.com/image.jpg",
      version: "vNext",
      state: JSON.stringify(json),
    };

    const html = getFrameHtmlHead(frame);

    expect(html).toContain(
      '<meta name="fc:frame:state" content="{&quot;test&quot;:&quot;&#39;&gt;&lt;&&quot;}"/>'
    );

    const result = await getFrame({
      htmlString: html,
      url: "http://framesjs.org",
      frameUrl: "http://framesjs.org",
    });

    if (result.specification !== "farcaster") {
      throw new Error(
        `Expected result to be a Farcaster frame but got ${result.specification}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- this is test
    expect(JSON.parse(result.frame.state!)).toEqual(json);
  });

  it("correctly serializes JSON containing double quotes", async () => {
    const json = { test: '"><&' };
    const frame: Frame = {
      image: "https://example.com/image.jpg",
      version: "vNext",
      state: JSON.stringify(json),
    };

    const html = getFrameHtmlHead(frame);

    expect(html).toContain(
      '<meta name="fc:frame:state" content="{&quot;test&quot;:&quot;\\&quot;&gt;&lt;&&quot;}"/>'
    );

    const result = await getFrame({
      htmlString: html,
      url: "http://framesjs.org",
      frameUrl: "http://framesjs.org",
    });

    if (result.specification !== "farcaster") {
      throw new Error(
        `Expected result to be a Farcaster frame but got ${result.specification}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- this is test
    expect(JSON.parse(result.frame.state!)).toEqual(json);
  });

  it("correctly serializes and deserializes text input containing single quotes", async () => {
    const inputText = "'test''''";
    const frame: Frame = {
      image: "https://example.com/image.jpg",
      version: "vNext",
      inputText,
    };

    const html = getFrameHtmlHead(frame);

    expect(html).toContain(
      '<meta name="fc:frame:input:text" content="&#39;test&#39;&#39;&#39;&#39;"/>'
    );

    const result = await getFrame({
      htmlString: html,
      url: "http://framesjs.org",
      frameUrl: "http://framesjs.org",
    });

    expect(result.frame).toMatchObject(frame);
  });

  it("correctly serializes and deserializes text input containing double quoes", async () => {
    const inputText = '"test""""';
    const frame: Frame = {
      image: "https://example.com/image.jpg",
      version: "vNext",
      inputText,
    };

    const html = getFrameHtmlHead(frame);

    expect(html).toContain(
      '<meta name="fc:frame:input:text" content="&quot;test&quot;&quot;&quot;&quot;"/>'
    );

    const result = await getFrame({
      htmlString: html,
      url: "http://framesjs.org",
      frameUrl: "http://framesjs.org",
    });

    expect(result.frame).toMatchObject(frame);
  });
});
