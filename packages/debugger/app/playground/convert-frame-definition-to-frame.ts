import type { Frame, FrameButton } from "frames.js";
import type { types } from "frames.js/core";
import { renderImage } from "./render-image";

export async function convertFrameDefinitionToFrame(
  frameDefinition: Partial<types.FrameDefinition<any>>
): Promise<Partial<Frame>> {
  const frame: Partial<Frame> = {};

  if (typeof frameDefinition.image === "string") {
    frame.image = frameDefinition.image;
  } else if (
    typeof frameDefinition.image === "object" &&
    frameDefinition.image
  ) {
    frame.image = await renderImage(
      frameDefinition.image,
      frameDefinition.imageOptions?.aspectRatio
    );
  }

  frame.imageAspectRatio =
    frameDefinition.imageOptions?.aspectRatio ?? "1.91:1";
  if (frameDefinition.accepts) {
    frame.accepts = frameDefinition.accepts;
  }

  if (frameDefinition.buttons) {
    const buttons: FrameButton[] = frameDefinition.buttons
      .map((button) => {
        if (!button || typeof button === "boolean") {
          return button;
        }

        if ("props" in button) {
          return {
            ...button.props,
            label: button.props.children,
          };
        }

        return button;
      })
      .filter(
        (button): button is FrameButton =>
          typeof button === "object" && !!button
      )
      .slice(0, 4);

    // @ts-expect-error -- this is correct but we use tuples so it is hard to type
    frame.buttons = buttons;
  }

  if (frameDefinition.textInput) {
    frame.inputText = frameDefinition.textInput;
  }

  if (Object.keys(frame).length === 0) {
    throw new Error("Could not find frame definition in the code");
  }

  return frame;
}
