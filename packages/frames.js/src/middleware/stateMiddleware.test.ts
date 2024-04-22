/* eslint-disable no-console -- we expect the usage of console.log */
import type { FramesContext } from "../core/types";
import { stateMiddleware } from "./stateMiddleware";

describe("stateMiddleware", () => {
  it("decodes JSON state from frame message and assigns it to ctx", async () => {
    const state = { foo: "bar" };
    const ctx = {
      message: { state: JSON.stringify(state) },
      initialState: {},
    };
    const mw = stateMiddleware();
    const next = jest.fn();

    await mw(ctx as unknown as FramesContext, next);

    expect(next).toHaveBeenCalledWith({ state });
  });

  it("uses initial state and warns user if JSON decode failed", async () => {
    console.warn = jest.fn();
    const state = { foo: "bar" };
    const ctx = {
      message: { state },
      initialState: { initial: true },
    };
    const mw = stateMiddleware();
    const next = jest.fn();

    expect(console.warn).not.toHaveBeenCalled();

    await mw(ctx as unknown as FramesContext, next);

    expect(console.warn).toHaveBeenCalled();

    expect(next).toHaveBeenCalledWith({ state: { initial: true } });
  });

  it("uses initial state if there is no message", async () => {
    const ctx = {
      initialState: { initial: true },
    };
    const mw = stateMiddleware();
    const next = jest.fn();

    await mw(ctx as unknown as FramesContext, next);

    expect(next).toHaveBeenCalledWith({ state: { initial: true } });
  });

  it("includes previous state in the result if it is not present", async () => {
    const state = { foo: "bar" };
    const ctx = {
      message: { state: JSON.stringify(state) },
      initialState: {},
    };
    const mw = stateMiddleware();
    const next = jest.fn().mockReturnValue({ image: "/test" });

    const result = await mw(ctx as unknown as FramesContext, next);

    expect(result).toEqual({ image: "/test", state });
  });
});
