import type { Frame, FrameButton } from "frames.js";
import type { createElement, ReactElement } from "react";

/**
 * Allows to override styling props on all component of the Frame UI
 */
export type FrameUIComponentStylingProps<
  TStylingProps extends Record<string, unknown>,
> = {
  Button: TStylingProps;
  ButtonsContainer: TStylingProps;
  Error: TStylingProps;
  Image: TStylingProps;
  ImageContainer: TStylingProps;
  LoadingScreen: TStylingProps;
  MessageTooltip: TStylingProps;
  Message: TStylingProps;
  Root: TStylingProps;
  TextInput: TStylingProps;
  TextInputContainer: TStylingProps;
};

type RequiredFrameProperties = "image" | "buttons";

/**
 * If partial frame rendering is enabled this is the shape of the frame
 */
export type PartialFrame = Omit<Partial<Frame>, RequiredFrameProperties> &
  Required<Pick<Frame, RequiredFrameProperties>>;

export type FrameUIState =
  | { status: "loading"; id: number }
  | {
      id: number;
      status: "partial";
      frame: PartialFrame;
      debugImage?: string;
      isImageLoading: boolean;
    }
  | {
      id: number;
      status: "complete";
      frame: Frame;
      debugImage?: string;
      isImageLoading: boolean;
    };

type FrameUIStateProps = {
  frameState: FrameUIState;
};

export type RootContainerDimensions = {
  width: number;
  height: number;
};

export type FrameImageContainerProps = {
  /**
   * Rendered in case when
   * - a message is returned in response to frame button press
   * - an error occurs in response to frame button press
   *
   * Uses components.MessageTooltip
   */
  messageTooltip: ReactElement | null;
  /**
   * Rendered if there is a frame image, uses components.Image
   */
  image: ReactElement | null;
  /**
   * Aspect ratio of current image or previous frame image if frame is loading
   */
  aspectRatio: "1:1" | "1.91:1";
} & FrameUIStateProps;

export type FrameLoadingScreenProps = FrameUIStateProps & {
  dimensions: RootContainerDimensions | null;
  previousFrame?: { 
    aspectRatio?: "1:1" | "1.91:1" | null;
    buttons?: number;
    textInput?: boolean;
  };
};

export type FrameButtonContainerProps = {
  buttons: ReactElement[];
} & FrameUIStateProps;

export type FrameTextInputContainerProps = {
  textInput: ReactElement;
  frame: FrameUIState;
};

export type FrameUIComponents<TStylingProps extends Record<string, unknown>> = {
  /**
   * Renders an error if the frame is not renderable
   */
  Error: (props: FrameErrorProps, stylingProps: TStylingProps) => ReactElement;
  /**
   * Wraps complete or partial frame rendering only,
   * in case of an error it is not used and components.Error is rendered instead.
   */
  Root: (
    props: FrameRootContainerProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered in components.Root in case the frame or frame's image is loading
   *
   * Usually this covers the whole Root since root has dimensions of previous frame
   */
  LoadingScreen: (
    props: FrameLoadingScreenProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  ImageContainer: (
    props: FrameImageContainerProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered only if frame has an image
   *
   * You have to handle the loading state of the image
   */
  Image: (props: FrameImageProps, stylingProps: TStylingProps) => ReactElement;
  /**
   * Rendered only if frame has at least one button
   */
  ButtonsContainer: (
    props: FrameButtonContainerProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  Button: (
    props: FrameButtonProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered only if frame has a text input
   */
  TextInputContainer: (
    props: FrameTextInputContainerProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered only if frame has a text input
   */
  TextInput: (
    props: FrameTextInputProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered in component.ImageContainer in case the frame button press returns a message
   */
  MessageTooltip: (
    props: FrameMessageTooltipProps,
    stylingProps: TStylingProps
  ) => ReactElement | null;
  /**
   * Rendered in case there is a message in response to a cast or composer action invokation.
   */
  Message: (
    props: FrameMessageProps,
    stylingProps: TStylingProps
  ) => ReactElement | null;
};

export type RootContainerElement = {
  computeDimensions: () => RootContainerDimensions | undefined;
};

export type FrameRootContainerProps = {
  /**
   * Used to create elements.
   *
   * This allows to change the implementation of createElement.
   * For example NativeWind needs to use their own implementation.
   */
  createElement: typeof createElement;
  /**
   * Dimensions of the root when button has been pressed.
   * Available only if frame or frame's image is in loading state.
   */
  dimensions: RootContainerDimensions | null;
  /**
   * Ref to the root container element
   *
   * Used to compute dimensions of the root container used on next framein response to button press
   */
  ref: React.RefObject<RootContainerElement>;
  /**
   * Uses components.ImageContainer
   *
   * Rendered also if the frame is loading
   */
  imageContainer: ReactElement;
  /**
   * Uses components.LoadingScreen
   *
   * Rendered when the frame or frame's image is loading
   *
   * Should cover the whole Root since root has dimensions of previous frame
   */
  loadingScreen: ReactElement | null;
  /**
   * Uses components.ButtonsContainer
   *
   * Rendered only if frame has at least one button
   */
  buttonsContainer: ReactElement | null;
  /**
   * Uses components.TextInputContainer
   *
   * Rendered only if frame has a text input
   */
  textInputContainer: ReactElement | null;
} & FrameUIStateProps;

export type FrameErrorProps = {
  message: string;
  error?: Error;
};

export type FrameImageProps = FrameUIStateProps & {
  onImageLoadEnd: () => void;
} & (
    | {
        status: "frame-loading";
        /**
         * Default value or aspect ratio from previous frame
         */
        aspectRatio: "1:1" | "1.91:1";
      }
    | {
        status: "frame-loading-complete";
        src: string;
        aspectRatio: "1:1" | "1.91:1";
      }
  );

export type FrameButtonProps = {
  isDisabled: boolean;
  frameButton: FrameButton;
  onPress: () => void;
  index: number;
} & FrameUIStateProps;

export type FrameTextInputProps = {
  isDisabled: boolean;
  placeholder: string;
  onChange: (text: string) => void;
  value?: string;
} & FrameUIStateProps;

export type FrameMessage = {
  message: string;
  status: "error" | "message";
};

export type FrameMessageTooltipProps = FrameMessage & FrameUIStateProps;

export type FrameMessageProps = FrameMessage;
