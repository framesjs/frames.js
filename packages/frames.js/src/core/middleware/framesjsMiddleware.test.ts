import { redirect } from "../redirect";
import type { FramesContext } from "../types";
import { generatePostButtonTargetURL } from "../utils";
import { framesjsMiddleware } from "./framesjsMiddleware";

describe("framesjsMiddleware middleware", () => {
  it("does not provide pressedButton to context if no supported button is detetcted", async () => {
    const context: FramesContext = {
      currentURL: new URL("https://example.com"),
      request: new Request("https://example.com", { method: "POST" }),
    } as any;
    const next = jest.fn();
    const middleware = framesjsMiddleware();

    await middleware(context, next);

    expect(next).toHaveBeenCalledWith({
      pressedButton: undefined,
      searchParams: {},
    });
  });

  it("provides pressedButton to context if post button is detected", async () => {
    const url = generatePostButtonTargetURL({
      buttonAction: "post",
      buttonIndex: 1,
      basePath: "/",
      currentURL: new URL("https://example.com"),
      target: {
        pathname: "/test",
        query: { test: true },
      },
    });
    const context: FramesContext = {
      currentURL: new URL(url),
      request: new Request(url, { method: "POST" }),
    } as any;
    const next = jest.fn();
    const middleware = framesjsMiddleware();

    await middleware(context, next);

    expect(next).toHaveBeenCalledWith({
      pressedButton: {
        action: "post",
        index: 1,
      },
      searchParams: { test: "true", __bi: "1:p" },
    });
  });

  it("provides pressedButton to context if post redirect button is detected", async () => {
    const url = generatePostButtonTargetURL({
      buttonAction: "post_redirect",
      buttonIndex: 1,
      basePath: "/",
      currentURL: new URL("https://example.com"),
      target: "/test",
    });
    const context: FramesContext = {
      currentURL: new URL(url),
      request: new Request(url, { method: "POST" }),
    } as any;
    const next = jest.fn(() => Promise.resolve(redirect("http://test.com")));
    const middleware = framesjsMiddleware();

    await middleware(context, next);

    expect(next).toHaveBeenCalledWith({
      pressedButton: {
        action: "post_redirect",
        index: 1,
      },
      searchParams: {
        __bi: "1:pr",
      },
    });
  });

  it("warns if the response for post redirect button is not a redirect Response", async () => {
    console.warn = jest.fn();
    const url = generatePostButtonTargetURL({
      buttonAction: "post_redirect",
      buttonIndex: 1,
      basePath: "/",
      currentURL: new URL("https://example.com"),
      target: "/test",
    });
    const context: FramesContext = {
      currentURL: new URL(url),
      request: new Request(url, { method: "POST" }),
    } as any;
    const next = jest.fn(() =>
      Promise.resolve(new Response(null, { status: 404 }))
    );
    const middleware = framesjsMiddleware();

    await middleware(context, next);

    expect(console.warn).toHaveBeenCalledWith(
      "The clicked button action was post_redirect, but the response was not a redirect"
    );
  });

  it("warns if the response for post button is a redirect definition", async () => {
    console.warn = jest.fn();
    const url = generatePostButtonTargetURL({
      buttonAction: "post",
      buttonIndex: 1,
      basePath: "/",
      currentURL: new URL("https://example.com"),
      target: {
        pathname: "/test",
        query: { test: true },
      },
    });
    const context: FramesContext = {
      currentURL: new URL(url),
      request: new Request(url, { method: "POST" }),
    } as any;
    const next = jest.fn(() => Promise.resolve(redirect("http://test.com")));
    const middleware = framesjsMiddleware();

    await middleware(context, next);

    expect(console.warn).toHaveBeenCalledWith(
      "The clicked button action was post, but the response was not a frame definition"
    );
  });

  it("warns if the response for post button is a Response", async () => {
    console.warn = jest.fn();
    const url = generatePostButtonTargetURL({
      buttonAction: "post",
      buttonIndex: 1,
      basePath: "/",
      currentURL: new URL("https://example.com"),
      target: {
        pathname: "/test",
        query: { test: true },
      },
    });
    const context: FramesContext = {
      currentURL: new URL(url),
      request: new Request(url, { method: "POST" }),
    } as any;
    const next = jest.fn(() =>
      Promise.resolve(new Response(null, { status: 200 }))
    );
    const middleware = framesjsMiddleware();

    await middleware(context, next);

    expect(console.warn).toHaveBeenCalledWith(
      "The clicked button action was post, but the response was not a frame definition"
    );
  });

  it('does nothing if the request method is not "POST"', async () => {
    const url = generatePostButtonTargetURL({
      buttonAction: "post",
      buttonIndex: 1,
      basePath: "/",
      currentURL: new URL("https://example.com"),
      target: {
        pathname: "/test",
        query: { test: true },
      },
    });
    const context: FramesContext = {
      currentURL: new URL(url),
      request: new Request(url),
    } as any;
    const next = jest.fn();
    const middleware = framesjsMiddleware();

    await middleware(context, next);

    expect(next).toHaveBeenCalledWith();
  });
});
