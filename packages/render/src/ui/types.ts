import type { Frame, FrameButton, FrameV2 } from "frames.js";
import type { createElement, ReactElement } from "react";
import type { ParsedFrameV2 } from "frames.js/frame-parsers";
import type { FrameState } from "../types";
import type { UseFrameReturnValue } from "../unstable-types";

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

/**
 * If partial frame rendering is enabled this is the shape of the frame
 */
export type PartialFrameV2 = Omit<ParsedFrameV2, "imageUrl" | "button"> & {
  imageUrl: NonNullable<ParsedFrameV2["imageUrl"]>;
  button: Omit<NonNullable<ParsedFrameV2["button"]>, "action" | "title"> & {
    action: Omit<
      NonNullable<NonNullable<ParsedFrameV2["button"]>["action"]>,
      "url" | "title"
    > & {
      url: NonNullable<
        NonNullable<NonNullable<ParsedFrameV2["button"]>["action"]>["url"]
      >;
    };
    title: NonNullable<
      NonNullable<NonNullable<ParsedFrameV2["button"]>["title"]>
    >;
  };
};

type FrameUIStateLoading = {
  status: "loading";
  id: number;
  frameState: FrameState | UseFrameReturnValue;
};

/**
 * Frame is partial. Available only if allowPartialFrame prop is enabled.
 */
export type FrameUIStatePartialFramesV1 = {
  id: number;
  status: "partial";
  frame: PartialFrame;
  frameState: FrameState | UseFrameReturnValue;
  debugImage?: string;
  isImageLoading: boolean;
};

/**
 * Frame is partial. Available only if allowPartialFrame prop is enabled.
 */
export type FrameUIStatePartialFramesV2 = {
  id: number;
  status: "partial";
  frame: PartialFrameV2;
  specification: "farcaster_v2";
  frameState: FrameState | UseFrameReturnValue;
  debugImage?: string;
  isImageLoading: boolean;
};

export type FrameUIStateCompleteFramesV1 = {
  id: number;
  status: "complete";
  frame: Frame;
  frameState: FrameState | UseFrameReturnValue;
  debugImage?: string;
  isImageLoading: boolean;
};

export type FrameUIStateCompleteFramesV2 = {
  id: number;
  status: "complete";
  specification: "farcaster_v2";
  frame: FrameV2;
  frameState: FrameState | UseFrameReturnValue;
  debugImage?: string;
  isImageLoading: boolean;
};

export type FrameUIState =
  | FrameUIStateLoading
  | FrameUIStatePartialFramesV1
  | FrameUIStatePartialFramesV2
  | FrameUIStateCompleteFramesV1
  | FrameUIStateCompleteFramesV2;

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
};

export type FrameButtonContainerProps = {
  buttons: ReactElement[];
  /** Props passed to buttons in the container */
  buttonsProps: FrameButtonProps[];
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

export type FrameLaunchButton = {
  action: "launch_frame";
  label: string;
};

export type FrameButtonProps = {
  isDisabled: boolean;
  frameButton: FrameButton | FrameLaunchButton;
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
