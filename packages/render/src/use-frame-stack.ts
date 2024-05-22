import { useReducer } from "react";
import type { Frame } from "frames.js";
import type { ParseResult } from "frames.js/frame-parsers";
import type { FrameReducerActions, FramesStack } from "./types";

export function isParseResult(
  result: Frame | ParseResult
): result is ParseResult {
  return "status" in result;
}

function framesStackReducer(
  state: FramesStack,
  action: FrameReducerActions
): FramesStack {
  switch (action.action) {
    case "LOAD":
      return [action.item, ...state];
    case "ADD_REQUEST_DETAILS": {
      const index = state.findIndex(
        (item) => item.timestamp === action.pendingItem.timestamp
      );

      if (index === -1) {
        return state;
      }

      const item = state[index];

      if (!item || item.status !== "pending") {
        return state;
      }

      state[index] = {
        ...item,
        requestDetails: action.requestDetails,
        url: action.url,
      };

      return state.slice();
    }
    case "DONE":
    case "REQUEST_ERROR": {
      const index = state.findIndex(
        (item) => item.timestamp === action.pendingItem.timestamp
      );

      if (index === -1) {
        return state;
      }

      state[index] = action.item;

      return state.slice();
    }
    case "RESET_INITIAL_FRAME": {
      const originalInitialFrame = state[0];
      const frame = isParseResult(action.resultOrFrame)
        ? action.resultOrFrame.frame
        : action.resultOrFrame;
      // initial frame is always set with done state
      const shouldReset =
        !originalInitialFrame ||
        (originalInitialFrame.status === "done" &&
          originalInitialFrame.frameResult.frame !== frame);

      if (shouldReset) {
        const frameResult = isParseResult(action.resultOrFrame)
          ? action.resultOrFrame
          : {
              status: "success" as const,
              reports: {},
              frame: action.resultOrFrame,
            };

        return [
          {
            request: {
              method: "GET",
              url: action.homeframeUrl ?? "",
            },
            url: action.homeframeUrl ?? "",
            requestDetails: {},
            responseStatus: 200,
            timestamp: new Date(),
            speed: 0,
            frameResult,
            status: "done",
            // @todo should this be result or frame?
            responseBody: frameResult,
          },
        ];
      }

      return state;
    }
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

type UseFrameStackOptions = {
  initialFrame?: Frame | ParseResult;
  initialFrameUrl?: string | null;
};

export function useFrameStack({
  initialFrame,
  initialFrameUrl,
}: UseFrameStackOptions): [FramesStack, React.Dispatch<FrameReducerActions>] {
  return useReducer(
    framesStackReducer,
    [initialFrame, initialFrameUrl] as const,
    ([frame, frameUrl]): FramesStack => {
      if (frame) {
        const frameResult = isParseResult(frame)
          ? frame
          : {
              reports: {},
              frame,
              status: "success" as const,
            };
        return [
          {
            responseStatus: 200,
            responseBody: frameResult,
            timestamp: new Date(),
            requestDetails: {},
            request: {
              method: "GET",
              url: frameUrl ?? "",
            },
            speed: 0,
            frameResult,
            status: "done",
            url: frameUrl ?? "",
          },
        ];
      } else if (frameUrl) {
        // prevent flash of empty if will shortly set this in first rerender
        // this is then handled by fetchFrame having second argument set to true so the stack is cleared
        return [
          {
            method: "GET",
            request: {
              method: "GET",
              url: frameUrl,
            },
            url: frameUrl,
            requestDetails: {},
            timestamp: new Date(),
            status: "pending",
          },
        ];
      }

      return [];
    }
  );
}
