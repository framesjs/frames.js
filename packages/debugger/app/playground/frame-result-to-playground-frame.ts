import type { types } from "frames.js/core";
import { GetFrameResult } from "@frames.js/render";
import { SerializedNode, deserializeJsx } from "frames.js/middleware/jsx-utils";

export type PlaygroundFrame = Partial<
  Omit<types.FrameDefinition<any>, "image">
> & {
  image?: string | SerializedNode[];
};

export function frameResultToPlaygroundFrame(
  result: GetFrameResult
): PlaygroundFrame {
  const frame: PlaygroundFrame = {
    accepts: result.frame.accepts,
    image: undefined,
    textInput: result.frame.inputText,
    buttons: result.frame.buttons,
  };

  if (result.framesDebugInfo?.jsx) {
    frame.image = result.framesDebugInfo.jsx;
  } else if (
    typeof result.frame.image === "string" &&
    !result.frame.image.match(/^data:/i)
  ) {
    // do not allow data uris here for now, those can be really long. Prefer storing them to session storage instead?
    frame.image = result.frame.image;
  }

  if (result.frame.imageAspectRatio) {
    frame.imageOptions = {
      aspectRatio: result.frame.imageAspectRatio,
    };
  }

  return frame;
}

export function playgroundFrameToFrameDefinition(
  frame: PlaygroundFrame
): Partial<types.FrameDefinition<any>> {
  const result: Partial<types.FrameDefinition<any>> = {
    accepts: frame.accepts,
    image: undefined,
    imageOptions: frame.imageOptions,
    buttons: frame.buttons,
    textInput: frame.textInput,
  };

  if (frame.image) {
    if (typeof frame.image === "string") {
      result.image = frame.image;
    } else {
      result.image = deserializeJsx(frame.image);
    }
  }

  return result;
}
