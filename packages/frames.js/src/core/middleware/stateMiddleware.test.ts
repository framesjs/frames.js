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

    await mw(ctx as any, next);

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

    await mw(ctx as any, next);

    expect(console.warn).toHaveBeenCalled();

    expect(next).toHaveBeenCalledWith({ state: { initial: true } });
  });

  it("uses initial state if there is no message", async () => {
    const ctx = {
      initialState: { initial: true },
    };
    const mw = stateMiddleware();
    const next = jest.fn();

    await mw(ctx as any, next);

    expect(next).toHaveBeenCalledWith({ state: { initial: true } });
  });
});
