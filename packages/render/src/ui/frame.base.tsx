import type { Frame } from "frames.js";
import {
  createElement as reactCreateElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FrameState } from "../types";
import type { UseFrameReturnValue } from "../unstable-types";
import type {
  FrameMessage,
  FrameUIComponents as BaseFrameUIComponents,
  FrameUIComponentStylingProps,
  FrameUIState,
  RootContainerDimensions,
  RootContainerElement,
} from "./types";
import {
  getErrorMessageFromFramesStackItem,
  isPartialFrameStackItem,
} from "./utils";

export type FrameUIComponents<TStylingProps extends Record<string, unknown>> =
  Partial<BaseFrameUIComponents<TStylingProps>>;

export type FrameUITheme<TStylingProps extends Record<string, unknown>> =
  Partial<FrameUIComponentStylingProps<TStylingProps>>;

export type BaseFrameUIProps<TStylingProps extends Record<string, unknown>> = {
  frameState: FrameState<any, any> | UseFrameReturnValue;
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
  components: Required<FrameUIComponents<TStylingProps>>;
  theme?: FrameUITheme<TStylingProps> | undefined;
  /**
   * Called when an error occurs in response to frame button press
   *
   * @defaultValue console.error()
   */
  onError?: (error: Error) => void;
  /**
   * Called when a messages is returned in response to frame button press
   */
  onMessage?: (message: FrameMessage) => void;
  /**
   * Custom createElement function to use when rendering components.
   *
   * This is useful for libraries like Nativewind that require a custom createElement function.
   *
   * @defaultValue React.createElement
   */
  createElement?: typeof reactCreateElement;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function -- this is noop
function defaultMessageHandler(): void {}

export function BaseFrameUI<TStylingProps extends Record<string, unknown>>({
  frameState,
  components,
  theme,
  allowPartialFrame = false,
  enableImageDebugging = false,
  // eslint-disable-next-line no-console -- provide at least some feedback to the user
  onError = console.error,
  onMessage = defaultMessageHandler,
  createElement = reactCreateElement,
}: BaseFrameUIProps<TStylingProps>): JSX.Element | null {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const { currentFrameStackItem } = frameState;
  const rootRef = useRef<RootContainerElement>(null);
  const rootDimensionsRef = useRef<RootContainerDimensions | undefined>();

  const onImageLoadEnd = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  useEffect(() => {
    // each time stack item changes and is pending we should set loading state
    if (currentFrameStackItem?.status === "pending") {
      setIsImageLoading(true);
    }
  }, [currentFrameStackItem?.status]);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (currentFrameStackItem?.status === "requestError") {
      onErrorRef.current(currentFrameStackItem.requestError);
    }
  }, [currentFrameStackItem]);

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (currentFrameStackItem?.status === "message") {
      onMessageRef.current({
        message: currentFrameStackItem.message,
        status: currentFrameStackItem.type === "info" ? "message" : "error",
      });
    }
  }, [currentFrameStackItem]);

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
  const previousFrameStackItem =
    frameState.framesStack[frameState.framesStack.length - 1];
  const previousFrame =
    previousFrameStackItem?.status === "done"
      ? previousFrameStackItem.frameResult.frame
      : null;

  switch (currentFrameStackItem.status) {
    case "requestError": {
      if (
        "sourceFrame" in currentFrameStackItem.request &&
        currentFrameStackItem.request.sourceFrame
      ) {
        frameUiState = {
          status: "complete",
          frame: currentFrameStackItem.request.sourceFrame,
          isImageLoading,
          id: currentFrameStackItem.id,
          frameState,
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
      if (!currentFrameStackItem.request.sourceFrame) {
        // this happens only for composer or cast actions, in that case just render Message
        return components.Message(
          {
            message: currentFrameStackItem.message,
            status:
              currentFrameStackItem.type === "error" ? "error" : "message",
          },
          theme?.Message ?? ({} as TStylingProps)
        );
      }

      frameUiState = {
        status: "complete",
        frame: currentFrameStackItem.request.sourceFrame,
        isImageLoading,
        id: currentFrameStackItem.id,
        frameState,
      };

      break;
    case "doneRedirect": {
      if (!currentFrameStackItem.request.sourceFrame) {
        frameUiState = {
          status: "loading",
          id: currentFrameStackItem.id,
          frameState,
        };
      } else {
        frameUiState = {
          status: "complete",
          frame: currentFrameStackItem.request.sourceFrame,
          isImageLoading,
          id: currentFrameStackItem.id,
          frameState,
        };
      }

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
          id: currentFrameStackItem.id,
          frameState,
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
          id: currentFrameStackItem.id,
          frameState,
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
      frameUiState = {
        status: "loading",
        id: currentFrameStackItem.id,
        frameState,
      };
      break;
    }
  }

  const isLoading =
    frameUiState.status === "loading" || frameUiState.isImageLoading;

  const buttonsProps =
    frameUiState.status === "loading" ||
    !frameUiState.frame.buttons ||
    frameUiState.frame.buttons.length === 0
      ? null
      : frameUiState.frame.buttons.map((frameButton, index) => ({
          frameState: frameUiState,
          frameButton,
          index,
          isDisabled: false,
          onPress() {
            // track dimensions of the root if possible
            rootDimensionsRef.current = rootRef.current?.computeDimensions();

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
        }));

  return components.Root(
    {
      createElement,
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
      buttonsContainer: buttonsProps
        ? components.ButtonsContainer(
            {
              frameState: frameUiState,
              buttons: buttonsProps.map((buttonProps) =>
                components.Button(
                  buttonProps,
                  theme?.Button || ({} as TStylingProps)
                )
              ),
              buttonsProps,
            },
            theme?.ButtonsContainer || ({} as TStylingProps)
          )
        : null,
      imageContainer: components.ImageContainer(
        {
          frameState: frameUiState,
          aspectRatio:
            (frameUiState.status === "loading"
              ? previousFrame?.imageAspectRatio
              : frameUiState.frame.imageAspectRatio) ?? "1.91:1",
          image: components.Image(
            frameUiState.status === "loading"
              ? {
                  status: "frame-loading",
                  frameState: frameUiState,
                  onImageLoadEnd,
                  aspectRatio: previousFrame?.imageAspectRatio ?? "1.91:1",
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
