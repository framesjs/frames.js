import { FRAMES_META_TAGS_HEADER } from "../core";
import { Button } from "../core/components";
import { redirect } from "../core/redirect";
import type { FramesContext } from "../core/types";
import { renderResponse } from "./renderResponse";
import * as vercelOg from "@vercel/og";

jest.mock("@vercel/og", () => {
  const arrayBufferMock = jest.fn(() => new ArrayBuffer(10));
  const constructorMock = jest.fn(
    () =>
      new (class {
        arrayBuffer = arrayBufferMock;
      })()
  );

  return {
    arrayBufferMock,
    constructorMock,
    ImageResponse: class {
      constructor(...args: any[]) {
        // @ts-expect-error
        return constructorMock(...args);
      }
      arrayBuffer = arrayBufferMock;
    },
  };
});

describe("renderResponse middleware", () => {
  let arrayBufferMock: jest.Mock = (vercelOg as any).arrayBufferMock;
  let constructorMock: jest.Mock = (vercelOg as any).constructorMock;
  const render = renderResponse();
  const context: FramesContext<undefined> = {
    basePath: "/",
    initialState: undefined,
    request: new Request("https://example.com"),
    url: new URL("https://example.com"),
  };

  beforeEach(() => {
    arrayBufferMock.mockClear();
    constructorMock.mockClear();
    context.request = new Request("https://example.com");
    context.url = new URL("https://example.com");
  });

  it("returns redirect Response if redirect is returned from handler", async () => {
    const result = await render(context, async () => {
      return redirect("https://example.com");
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("location")).toBe(
      "https://example.com"
    );
  });

  it("allows custom status code and headers for redirect", async () => {
    const result = await render(context, async () => {
      return redirect("https://example.com", {
        status: 307,
        headers: { "X-Test": "test" },
      });
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(307);
    expect((result as Response).headers.get("location")).toBe(
      "https://example.com"
    );
    expect((result as Response).headers.get("x-test")).toBe("test");
  });

  it("allows to render a Response frame with custom status code and headers", async () => {
    const result = await render(context, async () => {
      return new Response("Hello", {
        status: 201,
        headers: { "X-Test": "test" },
      });
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(201);
    expect((result as Response).headers.get("x-test")).toBe("test");
  });

  it("allows to render a frame with image defined as react element", async () => {
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button
            action="post"
            target={{ query: { value: "customStateValue1" } }}
          >
            Click me 1
          </Button>,
          <Button
            action="post"
            target={{ query: { a: true }, pathname: "/a/b" }}
          >
            Click me 2
          </Button>,
          <Button
            action="post"
            target={{ pathname: "/test", query: { value: 10 } }}
          >
            Click me 3
          </Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    await expect((result as Response).text()).resolves.toMatchSnapshot();
  });

  it("allows to render a frame as json if Accept header is used", async () => {
    context.request = new Request("https://example.com", {
      headers: {
        Accept: FRAMES_META_TAGS_HEADER,
      },
    });
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button
            action="post"
            target={{ query: { value: "customStateValue1" } }}
          >
            Click me 1
          </Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    expect((result as Response).headers.get("Content-Type")).toBe(
      "application/json"
    );
    await expect((result as Response).text()).resolves.toMatchSnapshot();
  });

  it("properly resolves against basePath", async () => {
    const newContext = { ...context, basePath: "/prefixed" };
    const result = await render(newContext, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button
            action="post"
            target={{
              pathname: "/test",
              query: { value: "customStateValue1" },
            }}
          >
            Click me 1
          </Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    await expect((result as Response).text()).resolves.toMatchSnapshot();
  });

  it("renders text input", async () => {
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        textInput: "My input",
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    await expect((result as Response).text()).resolves.toMatchSnapshot();
  });

  it("returns error 500 if image rendering fails", async () => {
    arrayBufferMock.mockRejectedValueOnce(
      new Error("Something failed during render")
    );
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    await expect((result as Response).text()).resolves.toBe(
      "Could not render image"
    );
  });

  it("returns 500 if invalid number of buttons is provided", async () => {
    // @ts-expect-error
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button action="post">Click me 1</Button>,
          <Button action="post">Click me 2</Button>,
          <Button action="post">Click me 3</Button>,
          <Button action="post">Click me 4</Button>,
          <Button action="post">Click me 5</Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    expect((result as Response).headers.get("Content-Type")).toBe("text/plain");
    await expect((result as Response).text()).resolves.toBe(
      "Only 4 buttons are allowed"
    );
  });

  it("returns 500 if unrecognized button action is provided", async () => {
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          // @ts-expect-error
          <Button action="invalid">Click me 1</Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    await expect((result as Response).text()).resolves.toBe(
      "Unrecognized button action"
    );
  });

  it("returns 500 if invalid button shape is provided", async () => {
    // @ts-expect-error
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          // this is not a proper object created by React.createElement()
          { action: "link", props: "invalid" },
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    await expect((result as Response).text()).resolves.toBe(
      "Invalid button provided"
    );
  });

  it("correctly renders image wich conditional content", async () => {
    const newContext = context;

    let result = await render(newContext, async () => {
      return {
        image: (
          <span>
            {"something" in newContext
              ? "Something is there"
              : "Something is not there"}
          </span>
        ),
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);

    expect(constructorMock).toHaveBeenCalledTimes(1);
    expect(constructorMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object)
    );
    expect(constructorMock.mock.calls[0][0]).toMatchSnapshot();

    // @ts-expect-error
    newContext.something = "true";

    result = await render(newContext, async () => {
      return {
        image: (
          <span>
            {"something" in newContext
              ? "Something is there"
              : "Something is not there"}
          </span>
        ),
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);

    expect(constructorMock).toHaveBeenCalledTimes(2);
    expect(constructorMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object)
    );
    expect(constructorMock.mock.calls[1][0]).toMatchSnapshot();
  });

  it("correctly renders tx button", async () => {
    context.request = new Request("https://example.com", {
      headers: {
        Accept: FRAMES_META_TAGS_HEADER,
      },
    });
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button action="tx" target="/tx" post_url="/txid">
            Tx button
          </Button>,
        ],
      };
    });

    const json = await (result as Response).json();

    expect(json["fc:frame:button:1"]).toBe("Tx button");
    expect(json["fc:frame:button:1:action"]).toBe("tx");
    expect(json["fc:frame:button:1:target"]).toBe(
      "https://example.com/tx?__bi=1%3Ap"
    );
    expect(json["fc:frame:button:1:post_url"]).toBe(
      "https://example.com/txid?__bi=1%3Ap"
    );
  });

  it("does not return a state on initial request (method GET)", async () => {
    console.warn = jest.fn();
    context.request = new Request("https://example.com", {
      method: "GET",
      headers: {
        Accept: FRAMES_META_TAGS_HEADER,
      },
    });

    expect(console.warn).not.toHaveBeenCalled();

    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        state: { test: true },
      };
    });

    expect(console.warn).toHaveBeenCalledTimes(1);

    const json = await (result as Response).json();

    expect(json["state"]).toBeUndefined();
  });

  it("returns a state on POST requests (these are not initial since those are always reactions to clicks)", async () => {
    console.warn = jest.fn();
    context.request = new Request("https://example.com", {
      method: "POST",
      headers: {
        Accept: FRAMES_META_TAGS_HEADER,
      },
    });
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        state: { test: true },
      };
    });

    expect(console.warn).not.toHaveBeenCalled();

    const json = await (result as Response).json();

    expect(console.warn).not.toHaveBeenCalled();
    expect(json["fc:frame:state"]).toEqual(JSON.stringify({ test: true }));
  });

  it("properly handles error from next middleware and returns response 500", async () => {
    const result = await render(context, async () => {
      throw new Error("Something went wrong");
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Content-Type")).toBe("text/plain");
    expect((result as Response).status).toBe(500);
    await expect((result as Response).text()).resolves.toBe(
      "Internal Server Error"
    );
  });

  it("properly handles error from next middleware and returns response 500 and JSON", async () => {
    context.request = new Request("https://example.com", {
      method: "POST",
      headers: {
        Accept: FRAMES_META_TAGS_HEADER,
      },
    });
    const result = await render(context, async () => {
      throw new Error("Something went wrong");
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Content-Type")).toBe(
      "application/json"
    );
    expect((result as Response).status).toBe(500);
    await expect((result as Response).text()).resolves.toBe(
      JSON.stringify({ error: "Internal Server Error" })
    );
  });

  it("properly renders button with targer object containing query", async () => {
    const url = new URL("https://example.com");
    url.searchParams.set("some_existing_param", "1");

    context.request = new Request(url, {
      method: "POST",
      headers: {
        Accept: FRAMES_META_TAGS_HEADER,
      },
    });
    context.url = url;
    context.basePath = "/test";
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button
            action="post"
            target={{ pathname: "/", query: { value: true } }}
          >
            Click me 1
          </Button>,
        ],
      };
    });

    const expectedUrl = new URL("/test", "https://example.com");
    expectedUrl.searchParams.append("value", "true");
    expectedUrl.searchParams.append("__bi", "1:p");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    const json = await (result as Response).json();
    expect(json["fc:frame:button:1:target"]).toBe(expectedUrl.toString());
  });
});
