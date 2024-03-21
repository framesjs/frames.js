import { redirect } from "../redirect";
import type { FramesContext } from "../types";
import { generatePostButtonTargetURL } from "../utils";
import { stateMiddleware } from "./stateMiddleware";

describe("clickedButtonParser middleware", () => {
  it("does not provide clickedButton to context if no supported button is detetcted", async () => {
    const context: FramesContext = {
      currentURL: new URL("https://example.com"),
      request: new Request("https://example.com", { method: "POST" }),
    } as any;
    const next = jest.fn();
    const middleware = stateMiddleware();

    await middleware(context, next);

    expect(next).toHaveBeenCalledWith({ clickedButton: undefined });
  });

  it("provides clickedButton to context if post button is detected", async () => {
    const url = generatePostButtonTargetURL({
      buttonAction: "post",
      buttonIndex: 1,
      basePath: "/",
      currentURL: new URL("https://example.com"),
      state: { test: true },
      target: "/test",
    });
    const context: FramesContext = {
      currentURL: new URL(url),
      request: new Request(url, { method: "POST" }),
    } as any;
    const next = jest.fn();
    const middleware = stateMiddleware();

    await middleware(context, next);

    expect(next).toHaveBeenCalledWith({
      state: { test: true },
    });
  });

  it("provides clickedButton to context if post redirect button is detected", async () => {
    const url = generatePostButtonTargetURL({
      buttonAction: "post_redirect",
      buttonIndex: 1,
      basePath: "/",
      currentURL: new URL("https://example.com"),
      state: undefined,
      target: "/test",
    });
    const context: FramesContext = {
      currentURL: new URL(url),
      request: new Request(url, { method: "POST" }),
    } as any;
    const next = jest.fn(() => Promise.resolve(redirect("http://test.com")));
    const middleware = stateMiddleware();

    await middleware(context, next);

    expect(next).toHaveBeenCalledWith({});
  });
});
