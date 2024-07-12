import type { Frame } from "frames.js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FrameState } from "../types";
import type {
  FrameUIComponents,
  FrameUIComponentStylingProps,
  FrameUIState,
  RootContainerDimensions,
  RootContainerElement,
} from "./types";
import {
  getErrorMessageFromFramesStackItem,
  isPartialFrameStackItem,
} from "./utils";

export type BaseFrameUIProps<TStylingProps extends Record<string, unknown>> = {
  frameState: FrameState;
  /**
   * Renders also frames that contain only image and at least one button
   *
   * @defaultValue false
   */
  allowPartialFrame?: boolean;
  /**
   * Renders debug image if available
   */
  enableImageDebugging?: boolean;
  components: FrameUIComponents<TStylingProps>;
  theme?: Partial<FrameUIComponentStylingProps<TStylingProps>> | undefined;
  /**
   * Called when an error occurs in response to frame button press
   *
   * @defaultValue console.error()
   */
  onError?: (error: Error) => void;
};

export function BaseFrameUI<TStylingProps extends Record<string, unknown>>({
  frameState,
  components,
  theme,
  allowPartialFrame = false,
  enableImageDebugging = false,
  // eslint-disable-next-line no-console -- provide at least some feedback to the user
  onError = console.error,
}: BaseFrameUIProps<TStylingProps>): JSX.Element | null {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const { currentFrameStackItem } = frameState;
  const rootRef = useRef<RootContainerElement>(null);
  const rootDimensionsRef = useRef<RootContainerDimensions | undefined>();
  const previousFrameAspectRatioRef = useRef<"1:1" | "1.91:1" | undefined>();

  const onImageLoadEnd = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  useEffect(() => {
    // each time stack item changes and is pending we should set loading state
    if (currentFrameStackItem?.status === "pending") {
      setIsImageLoading(true);
    }
  }, [currentFrameStackItem?.status]);

  useEffect(() => {
    if (currentFrameStackItem?.status === "requestError") {
      onError(currentFrameStackItem.requestError);
    }
  }, [currentFrameStackItem, onError]);

  if (!frameState.homeframeUrl) {
    return components.Error(
      { message: "Missing frame url" },
      theme?.Error || ({} as TStylingProps)
    );
  }

  if (!currentFrameStackItem) {
    return null;
  }

  let frameUiState: FrameUIState;

  switch (currentFrameStackItem.status) {
    case "requestError": {
      if ("sourceFrame" in currentFrameStackItem.request) {
        frameUiState = {
          status: "complete",
          frame: currentFrameStackItem.request.sourceFrame,
          isImageLoading,
        };
      } else {
        return components.Error(
          {
            message: "Failed to load frame",
            error: currentFrameStackItem.requestError,
          },
          theme?.Error || ({} as TStylingProps)
        );
      }

      break;
    }
    case "message":
    case "doneRedirect": {
      frameUiState = {
        status: "complete",
        frame: currentFrameStackItem.request.sourceFrame,
        isImageLoading,
      };
      break;
    }
    case "done": {
      if (currentFrameStackItem.frameResult.status === "success") {
        frameUiState = {
          status: "complete",
          frame: currentFrameStackItem.frameResult.frame,
          debugImage: enableImageDebugging
            ? currentFrameStackItem.frameResult.framesDebugInfo?.image
            : undefined,
          isImageLoading,
        };
      } else if (
        isPartialFrameStackItem(currentFrameStackItem) &&
        allowPartialFrame
      ) {
        frameUiState = {
          status: "partial",
          frame: currentFrameStackItem.frameResult.frame,
          debugImage: enableImageDebugging
            ? currentFrameStackItem.frameResult.framesDebugInfo?.image
            : undefined,
          isImageLoading,
        };
      } else {
        return components.Error(
          { message: "Invalid frame" },
          theme?.Error || ({} as TStylingProps)
        );
      }

      break;
    }
    case "pending": {
      frameUiState = { status: "loading" };
      break;
    }
  }

  const isLoading =
    frameUiState.status === "loading" || frameUiState.isImageLoading;

  return components.Root(
    {
      frameState: frameUiState,
      dimensions: isLoading ? rootDimensionsRef.current ?? null : null,
      ref: rootRef,
      loadingScreen: isLoading
        ? components.LoadingScreen(
            {
              frameState: frameUiState,
              dimensions: rootDimensionsRef.current ?? null,
            },
            theme?.LoadingScreen || ({} as TStylingProps)
          )
        : null,
      buttonsContainer:
        frameUiState.status === "loading" ||
        !frameUiState.frame.buttons ||
        frameUiState.frame.buttons.length === 0
          ? null
          : components.ButtonsContainer(
              {
                frameState: frameUiState,
                buttons: frameUiState.frame.buttons.map((frameButton, index) =>
                  components.Button(
                    {
                      frameState: frameUiState,
                      frameButton,
                      index,
                      // @TODO provide previous frame to pending state so we can remove loading check and render some loading indicator?
                      isDisabled: false,
                      onPress() {
                        // track dimensions of the root if possible
                        rootDimensionsRef.current =
                          rootRef.current?.computeDimensions();

                        // track aspect ratio of image
                        previousFrameAspectRatioRef.current =
                          frameUiState.frame.imageAspectRatio ?? "1.91:1";

                        Promise.resolve(
                          frameState.onButtonPress(
                            // @todo change the type onButtonPress to accept partial frame as well because that can happen if partial frames are enabled
                            frameUiState.frame as Frame,
                            frameButton,
                            index
                          )
                        ).catch((error) => {
                          // eslint-disable-next-line no-console -- provide feedback to the user
                          console.error(error);
                        });
                      },
                    },
                    theme?.Button || ({} as TStylingProps)
                  )
                ),
              },
              theme?.ButtonsContainer || ({} as TStylingProps)
            ),
      imageContainer: components.ImageContainer(
        {
          frameState: frameUiState,
          aspectRatio:
            (frameUiState.status === "loading"
              ? previousFrameAspectRatioRef.current
              : frameUiState.frame.imageAspectRatio) ?? "1.91:1",
          image: components.Image(
            frameUiState.status === "loading"
              ? {
                  status: "frame-loading",
                  frameState: frameUiState,
                  onImageLoadEnd,
                  aspectRatio: previousFrameAspectRatioRef.current ?? "1.91:1",
                }
              : {
                  status: "frame-loading-complete",
                  frameState: frameUiState,
                  src: frameUiState.debugImage ?? frameUiState.frame.image,
                  aspectRatio: frameUiState.frame.imageAspectRatio ?? "1.91:1",
                  onImageLoadEnd,
                },
            theme?.Image || ({} as TStylingProps)
          ),
          messageTooltip:
            currentFrameStackItem.status === "message"
              ? components.MessageTooltip(
                  {
                    frameState: frameUiState,
                    status:
                      currentFrameStackItem.type === "error"
                        ? "error"
                        : "message",
                    message: getErrorMessageFromFramesStackItem(
                      currentFrameStackItem
                    ),
                  },
                  theme?.MessageTooltip || ({} as TStylingProps)
                )
              : null,
        },
        theme?.ImageContainer || ({} as TStylingProps)
      ),
      textInputContainer:
        frameUiState.status === "loading" ||
        typeof frameUiState.frame.inputText !== "string"
          ? null
          : components.TextInputContainer(
              {
                frame: frameUiState,
                textInput: components.TextInput(
                  {
                    // @TODO provide previous frame to pending state so we can remove loading check and render skeletons?
                    isDisabled: false,
                    frameState: frameUiState,
                    placeholder: frameUiState.frame.inputText,
                    onChange(text) {
                      frameState.setInputText(text);
                    },
                    value: frameState.inputText,
                  },
                  theme?.TextInput || ({} as TStylingProps)
                ),
              },
              theme?.TextInputContainer || ({} as TStylingProps)
            ),
    },
    theme?.Root || ({} as TStylingProps)
  );
}
