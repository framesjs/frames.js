import type { FrameStackDone, FrameState } from "@frames.js/render";
import type { Frame } from "frames.js";

type UseMockFrameOptions = {
  frame: Partial<Frame>;
};

export function useMockFrame({ frame }: UseMockFrameOptions): FrameState {
  const framesStack: FrameStackDone[] = [
    {
      frameResult: {
        frame,
        reports: {},
        status: "failure", // @todo detect if the frame is valid and use success in that case?
        framesVersion: undefined,
      },
      status: "done",
      request: {
        method: "GET",
        url: "http://localhost",
      },
      responseStatus: 200,
      responseBody: "",
      requestDetails: {},
      speed: 0,
      timestamp: new Date(),
      url: "/",
    },
  ];

  return {
    clearFrameStack() {},
    dispatchFrameStack() {},
    async fetchFrame() {},
    currentFrameStackItem: framesStack[0],
    framesStack,
    homeframeUrl: "http://localhost",
    inputText: "",
    onButtonPress(...args) {
      console.log("onButtonPress", ...args);
    },
    setInputText() {},
  };
}
