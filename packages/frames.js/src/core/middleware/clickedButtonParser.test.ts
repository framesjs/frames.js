import { redirect } from "../redirect";
import { FramesContext } from "../types";
import { generatePostButtonTargetURL } from "../utils";
import { clickedButtonParser } from "./clickedButtonParser";

describe("clickedButtonParser middleware", () => {
  it("does not provide clickedButton to context if no supported button is detetcted", async () => {
    const context: FramesContext = {
      currentURL: new URL("https://example.com"),
    } as any;
    const next = jest.fn();
    const middleware = clickedButtonParser();

    await middleware(context, next);

    expect(next).toHaveBeenCalledWith({ clickedButton: undefined });
  });

  it("provides clickedButton to context if post button is detected", async () => {
    const url = generatePostButtonTargetURL({
      buttonAction: "post",
      buttonIndex: 1,
      basePath: "/",
      request: new Request("https://example.com"),
      state: { test: true },
      target: "/test",
    });
    const context: FramesContext = {
      currentURL: new URL(url),
    } as any;
    const next = jest.fn();
    const middleware = clickedButtonParser();

    await middleware(context, next);

    expect(next).toHaveBeenCalledWith({
      clickedButton: { action: "post", index: 1, state: { test: true } },
    });
  });

  it("provides clickedButton to context if post redirect button is detected", async () => {
    const url = generatePostButtonTargetURL({
      buttonAction: "post_redirect",
      buttonIndex: 1,
      basePath: "/",
      request: new Request("https://example.com"),
      state: undefined,
      target: "/test",
    });
    const context: FramesContext = {
      currentURL: new URL(url),
    } as any;
    const next = jest.fn(() => redirect("http://test.com"));
    const middleware = clickedButtonParser();

    await middleware(context, next);

    expect(next).toHaveBeenCalledWith({
      clickedButton: { action: "post_redirect", index: 1 },
    });
  });

  it("warns if the response for post redirect button is not a redirect Response", async () => {
    console.warn = jest.fn();
    const url = generatePostButtonTargetURL({
      buttonAction: "post_redirect",
      buttonIndex: 1,
      basePath: "/",
      request: new Request("https://example.com"),
      state: undefined,
      target: "/test",
    });
    const context: FramesContext = {
      currentURL: new URL(url),
    } as any;
    const next = jest.fn(() => new Response(null, { status: 404 }));
    const middleware = clickedButtonParser();

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
      request: new Request("https://example.com"),
      state: { test: true },
      target: "/test",
    });
    const context: FramesContext = {
      currentURL: new URL(url),
    } as any;
    const next = jest.fn(() => redirect("http://test.com"));
    const middleware = clickedButtonParser();

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
      request: new Request("https://example.com"),
      state: { test: true },
      target: "/test",
    });
    const context: FramesContext = {
      currentURL: new URL(url),
    } as any;
    const next = jest.fn(() => new Response(null, { status: 200 }));
    const middleware = clickedButtonParser();

    await middleware(context, next);

    expect(console.warn).toHaveBeenCalledWith(
      "The clicked button action was post, but the response was not a frame definition"
    );
  });
});
