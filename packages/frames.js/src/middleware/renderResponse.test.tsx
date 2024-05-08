/* eslint-disable no-console -- we are expecting console usage */
/* eslint-disable @typescript-eslint/require-await -- middleware expects async functions */
/* eslint-disable testing-library/render-result-naming-convention -- we are not using react testing library here */
import * as vercelOg from "@vercel/og";
import { FRAMES_META_TAGS_HEADER } from "../core";
import { Button } from "../core/components";
import { error } from "../core/error";
import { redirect } from "../core/redirect";
import type { FramesContext } from "../core/types";
import { resolveBaseUrl } from "../core/utils";
import { renderResponse } from "./renderResponse";

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
      constructor(...args: unknown[]) {
        // @ts-expect-error -- we are mocking the constructor
        constructorMock(...args);
      }
      arrayBuffer = arrayBufferMock;
    },
  };
});

jest.mock(
  "../../package.json",
  () => ({
    version: "0.0.0-mock",
  }),
  { virtual: true }
);

describe("renderResponse middleware", () => {
  const arrayBufferMock: jest.Mock = (
    vercelOg as unknown as { arrayBufferMock: jest.Mock }
  ).arrayBufferMock;
  const constructorMock: jest.Mock = (
    vercelOg as unknown as { constructorMock: jest.Mock }
  ).constructorMock;
  const render = renderResponse();
  const request = new Request("https://example.com");
  const context: FramesContext<undefined> = {
    basePath: "/",
    initialState: undefined,
    request,
    url: new URL("https://example.com"),
    baseUrl: resolveBaseUrl(request, undefined, "/"),
  };

  beforeEach(() => {
    arrayBufferMock.mockClear();
    constructorMock.mockClear();
    context.basePath = "/";
    context.request = new Request("https://example.com");
    context.url = new URL("https://example.com");
    context.baseUrl = resolveBaseUrl(context.request, undefined, "/");
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
            key="1"
            target={{ query: { value: "customStateValue1" } }}
          >
            Click me 1
          </Button>,
          <Button
            action="post"
            key="2"
            target={{ query: { a: true }, pathname: "/a/b" }}
          >
            Click me 2
          </Button>,
          <Button
            action="post"
            key="3"
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
            key="1"
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

  it("properly resolves against baseUrl", async () => {
    const newContext = {
      ...context,
      baseUrl: new URL("https://example.com/prefixed"),
    };
    const result = await render(newContext, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button
            action="post"
            key="1"
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

  it("returns application error if error function is called", async () => {
    const result = await render(context, async () => {
      error("Custom error message");
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
    await expect((result as Response).json()).resolves.toEqual({
      message: "Custom error message",
    });
  });

  it("returns application error if error function is called with custom status code", async () => {
    const result = await render(context, async () => {
      error("Custom error message", 401);
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    await expect((result as Response).json()).resolves.toEqual({
      message: "Custom error message",
    });
  });

  it("does not allow application errors with status codes other than 4XX", async () => {
    const result1 = await render(context, async () => {
      // @ts-expect-error -- we are providing invalid status code
      error("Custom error message", 200);
    });

    expect(result1).toBeInstanceOf(Response);
    expect((result1 as Response).headers.get("Content-Type")).toBe(
      "text/plain"
    );
    expect((result1 as Response).status).toBe(500);
    await expect((result1 as Response).text()).resolves.toBe(
      "Internal Server Error"
    );

    const result2 = await render(context, async () => {
      // @ts-expect-error -- we are providing invalid status code
      error("Custom error message", 500);
    });

    expect(result2).toBeInstanceOf(Response);
    expect((result2 as Response).headers.get("Content-Type")).toBe(
      "text/plain"
    );
    expect((result2 as Response).status).toBe(500);
    await expect((result2 as Response).text()).resolves.toBe(
      "Internal Server Error"
    );
  });

  it("returns 500 if invalid number of buttons is provided", async () => {
    // @ts-expect-error -- we are providing more than 4 buttons
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button action="post" key="1">
            Click me 1
          </Button>,
          <Button action="post" key="2">
            Click me 2
          </Button>,
          <Button action="post" key="3">
            Click me 3
          </Button>,
          <Button action="post" key="4">
            Click me 4
          </Button>,
          <Button action="post" key="5">
            Click me 5
          </Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    expect((result as Response).headers.get("Content-Type")).toBe("text/plain");
    await expect((result as Response).text()).resolves.toBe(
      "Up to 4 buttons are allowed"
    );
  });

  it("returns 500 if unrecognized button action is provided", async () => {
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          // @ts-expect-error -- props are not matching the expected type
          <Button action="invalid" key="1">
            Click me 1
          </Button>,
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
    // @ts-expect-error -- returns invalid object shape
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
    expect((constructorMock.mock.calls[0] as unknown[])[0]).toMatchSnapshot();

    // @ts-expect-error -- we are modifying the context object
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
    expect((constructorMock.mock.calls[1] as unknown[])[0]).toMatchSnapshot();
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
          <Button action="tx" key="1" target="/tx" post_url="/txid">
            Tx button
          </Button>,
        ],
      };
    });

    const json = (await (result as Response).json()) as Record<string, string>;

    expect(json["fc:frame:button:1"]).toBe("Tx button");
    expect(json["fc:frame:button:1:action"]).toBe("tx");
    expect(json["fc:frame:button:1:target"]).toBe(
      "https://example.com/tx?__bi=1-p"
    );
    expect(json["fc:frame:button:1:post_url"]).toBe(
      "https://example.com/txid?__bi=1-p"
    );
  });

  it("returns 500 if state returned from next middleware is not a string", async () => {
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        state: { test: true },
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    await expect((result as Response).text()).resolves.toBe(
      "State must be a string"
    );
  });

  it("returns a state as is from next middleware", async () => {
    context.request = new Request("https://example.com", {
      method: "POST",
      headers: {
        Accept: FRAMES_META_TAGS_HEADER,
      },
    });
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        state: JSON.stringify({ test: true }),
      };
    });

    const json = (await (result as Response).json()) as Record<string, string>;

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

  it("properly renders button with target object containing query", async () => {
    const url = new URL("https://example.com");
    url.searchParams.set("some_existing_param", "1");

    context.request = new Request(url, {
      method: "POST",
      headers: {
        Accept: FRAMES_META_TAGS_HEADER,
      },
    });
    context.url = url;
    context.baseUrl = new URL("https://example.com/test");
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button
            action="post"
            key="1"
            target={{ pathname: "/", query: { value: true } }}
          >
            Click me 1
          </Button>,
        ],
      };
    });

    const expectedUrl = new URL("/test", "https://example.com");
    expectedUrl.searchParams.append("value", "true");
    expectedUrl.searchParams.append("__bi", "1-p");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    const json = (await (result as Response).json()) as Record<string, string>;
    expect(json["fc:frame:button:1:target"]).toBe(expectedUrl.toString());
  });

  it("ignores null/undefined buttons are correctly assigns indexes", async () => {
    context.request = new Request("http://example.com", {
      method: "POST",
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
            key="1"
            target={{ pathname: "/", query: { value: true } }}
          >
            Click me 1
          </Button>,
          null,
          true,
          <Button action="post" key="2" target="/">
            Click me 2
          </Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    const json = (await (result as Response).json()) as Record<string, string>;
    expect(json).toMatchObject({
      "fc:frame:button:1": "Click me 1",
      "fc:frame:button:1:target": expect.any(String) as string,
      "fc:frame:button:2": "Click me 2",
      "fc:frame:button:2:target": expect.any(String) as string,
    });
  });
});
