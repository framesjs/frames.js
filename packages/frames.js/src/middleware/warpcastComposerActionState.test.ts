/* eslint-disable no-console -- we expect the usage of console.log */
import type {
  ComposerActionStateFromMessage,
  FramesContext,
} from "../core/types";
import { warpcastComposerActionState } from "./warpcastComposerActionState";

describe("warpcastComposerActionState", () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleWarnSpy = jest.spyOn(console, "warn");
  });

  beforeEach(() => {
    consoleWarnSpy.mockReset();
  });

  it("decodes URL encoded state from frame message and assigns it to ctx", async () => {
    const state = {
      cast: { text: "test", embeds: [] },
    } satisfies ComposerActionStateFromMessage;
    const ctx = {
      message: { state: encodeURIComponent(JSON.stringify(state)) },
      initialState: {},
      request: new Request("http://localhost", { method: "POST" }),
    };
    const mw = warpcastComposerActionState();
    const next = jest.fn();

    await mw(ctx as unknown as FramesContext, next);

    expect(next).toHaveBeenCalledWith({
      composerActionState: { text: "test", embeds: [] },
    });
  });

  it("calls next middleware without warning if there is no message", async () => {
    const ctx = {
      initialState: {},
      request: new Request("http://localhost", { method: "POST" }),
    };

    const mw = warpcastComposerActionState();
    const next = jest.fn();

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    await mw(ctx as unknown as FramesContext, next);
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    expect(next).toHaveBeenCalledWith();
  });

  it("calls next middleware without warning if there is no state in message", async () => {
    const ctx = {
      message: {},
      initialState: {},
      request: new Request("http://localhost", { method: "POST" }),
    };

    const mw = warpcastComposerActionState();
    const next = jest.fn();

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    await mw(ctx as unknown as FramesContext, next);
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    expect(next).toHaveBeenCalledWith();
  });

  it("calls next middleware if the state in message is not from composer", async () => {
    const ctx = {
      message: { state: JSON.stringify({ test: "test" }) },
      initialState: {},
      request: new Request("http://localhost", { method: "POST" }),
    };

    const mw = warpcastComposerActionState();
    const next = jest.fn();

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    await mw(ctx as unknown as FramesContext, next);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    expect(next).toHaveBeenCalledWith();
  });
});
