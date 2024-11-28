import type { Frame, FrameV2 } from "frames.js";
import {
  createElement as reactCreateElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FrameState } from "../types";
import type { UseFrameReturnValue } from "../unstable-types";
import { useFreshRef } from "../hooks/use-fresh-ref";
import type {
  FrameMessage,
  FrameUIComponents as BaseFrameUIComponents,
  FrameUIComponentStylingProps,
  FrameUIState,
  RootContainerDimensions,
  RootContainerElement,
  FrameButtonProps,
  PartialFrameV2,
} from "./types";
import {
  getErrorMessageFromFramesStackItem,
  isPartialFrameStackItem,
} from "./utils";

export type FrameUIComponents<TStylingProps extends Record<string, unknown>> =
  Partial<BaseFrameUIComponents<TStylingProps>>;

export type FrameUITheme<TStylingProps extends Record<string, unknown>> =
  Partial<FrameUIComponentStylingProps<TStylingProps>>;

export type AppLaunchButtonPressEvent =
  | {
      status: "complete";
      frame: FrameV2;
      frameUIState: FrameUIState;
    }
  | {
      status: "partial";
      frame: PartialFrameV2;
      frameUIState: FrameUIState;
    };

export type BaseFrameUIProps<TStylingProps extends Record<string, unknown>> = {
  frameState:
    | FrameState<any, any>
    | UseFrameReturnValue<any, any, any, any, any>;
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
  /**
   * Called when user presses launch button on v2 frame.
   *
   * Only Frames v2 support this feature.
   */
  onAppLaunchButtonPress?: (event: AppLaunchButtonPressEvent) => void;
  /**
   * Called when an error occurs in onAppLaunchButtonPress
   *
   * @defaultValue console.error()
   */
  onAppLaunchButtonPressError?: (error: Error) => void;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function -- this is noop
function defaultMessageHandler(): void {}

// eslint-disable-next-line @typescript-eslint/no-empty-function -- this is noop
function defaultOnAppLaunchButtonPress(): void {}

function defaultErrorLogger(error: Error): void {
  // eslint-disable-next-line no-console -- provide at least some feedback to the user
  console.error(error);
}

export function BaseFrameUI<TStylingProps extends Record<string, unknown>>({
  frameState,
  components,
  theme,
  allowPartialFrame = false,
  enableImageDebugging = false,
  onError = defaultErrorLogger,
  onAppLaunchButtonPressError = defaultErrorLogger,
  onMessage = defaultMessageHandler,
  createElement = reactCreateElement,
  onAppLaunchButtonPress = defaultOnAppLaunchButtonPress,
}: BaseFrameUIProps<TStylingProps>): JSX.Element | null {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const { currentFrameStackItem } = frameState;
  const rootRef = useRef<RootContainerElement>(null);
  const rootDimensionsRef = useRef<RootContainerDimensions | undefined>();
  const onErrorRef = useFreshRef(onError);
  const onAppLaunchButtonPressErrorRef = useFreshRef(
    onAppLaunchButtonPressError
  );

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
      onErrorRef.current(currentFrameStackItem.requestError);
    }
  }, [currentFrameStackItem, onErrorRef]);

  const onMessageRef = useFreshRef(onMessage);

  useEffect(() => {
    if (currentFrameStackItem?.status === "message") {
      onMessageRef.current({
        message: currentFrameStackItem.message,
        status: currentFrameStackItem.type === "info" ? "message" : "error",
      });
    }
  }, [currentFrameStackItem, onMessageRef]);

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
  /**
   * Frames v2 don' have previous frame as they consist purely of initial frame only
   */
  const previousFrame =
    previousFrameStackItem?.status === "done" &&
    previousFrameStackItem.frameResult.specification !== "farcaster_v2"
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
        if (
          currentFrameStackItem.frameResult.specification === "farcaster_v2"
        ) {
          frameUiState = {
            status: "complete",
            frame: currentFrameStackItem.frameResult.frame,
            specification: "farcaster_v2",
            debugImage: enableImageDebugging
              ? currentFrameStackItem.frameResult.framesDebugInfo?.image
              : undefined,
            isImageLoading,
            id: currentFrameStackItem.id,
            frameState,
          };
        } else {
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
        }
      } else if (
        isPartialFrameStackItem(currentFrameStackItem) &&
        allowPartialFrame
      ) {
        if (
          currentFrameStackItem.frameResult.specification === "farcaster_v2"
        ) {
          frameUiState = {
            status: "partial",
            frame: currentFrameStackItem.frameResult.frame,
            specification: "farcaster_v2",
            debugImage: enableImageDebugging
              ? currentFrameStackItem.frameResult.framesDebugInfo?.image
              : undefined,
            isImageLoading,
            id: currentFrameStackItem.id,
            frameState,
          };
        } else {
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
        }
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

  let buttonsProps: FrameButtonProps[] | null = null;

  if (frameUiState.status !== "loading") {
    if ("specification" in frameUiState) {
      buttonsProps = [
        {
          frameState: frameUiState,
          frameButton: {
            action: "launch",
            label: frameUiState.frame.button.title,
          },
          index: 0,
          isDisabled: false,
          onPress() {
            // we don't need to track dimensions here because this button does nothing to frame stack
            try {
              onAppLaunchButtonPress(
                frameUiState.status === "complete"
                  ? {
                      status: "complete",
                      frame: frameUiState.frame,
                      frameUIState: frameUiState,
                    }
                  : {
                      status: "partial",
                      frame: frameUiState.frame,
                      frameUIState: frameUiState,
                    }
              );
            } catch (e) {
              onAppLaunchButtonPressErrorRef.current(
                e instanceof Error ? e : new Error(String(e))
              );
            }
          },
        },
      ];
    } else if (
      frameUiState.frame.buttons &&
      frameUiState.frame.buttons.length > 0
    ) {
      buttonsProps = frameUiState.frame.buttons.map((frameButton, index) => ({
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
          ).catch((e) => {
            onErrorRef.current(e instanceof Error ? e : new Error(String(e)));
          });
        },
      }));
    }
  }

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
            // eslint-disable-next-line no-nested-ternary -- unnecessary to extract this to a variable
            (frameUiState.status === "loading"
              ? previousFrame?.imageAspectRatio
              : "specification" in frameUiState
                ? "1.91:1"
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
                  src:
                    frameUiState.debugImage ??
                    ("specification" in frameUiState
                      ? frameUiState.frame.imageUrl
                      : frameUiState.frame.image),
                  aspectRatio:
                    ("specification" in frameUiState
                      ? undefined
                      : frameUiState.frame.imageAspectRatio) ?? "1.91:1",
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
        "specification" in frameUiState ||
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
