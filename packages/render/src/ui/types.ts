import type { Frame, FrameButton } from "frames.js";
import type { ReactElement } from "react";

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
  | { status: "loading" }
  | {
      status: "partial";
      frame: PartialFrame;
      debugImage?: string;
      isImageLoading: boolean;
    }
  | {
      status: "complete";
      frame: Frame;
      debugImage?: string;
      isImageLoading: boolean;
    };

type FrameUIStateProps = {
  frameState: FrameUIState;
};

type RootDimensions = {
  width: number;
  height: number;
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
    props: {
      /**
       * Dimensions of the root when button has been pressed.
       * Available only if frame or frame's image is in loading state.
       */
      dimensions: RootDimensions | null;
      /**
       * Ref to the root element, used to compute the dimensions of the frame
       */
      ref: React.RefObject<any>;
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
    } & FrameUIStateProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered in components.Root in case the frame or frame's image is loading
   *
   * Usually this covers the whole Root since root has dimensions of previous frame
   */
  LoadingScreen: (
    props: FrameUIStateProps & { dimensions: RootDimensions | null },
    stylingProps: TStylingProps
  ) => ReactElement;
  ImageContainer: (
    props: {
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
    } & FrameUIStateProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered only if frame has an image
   *
   * You have to handle the loading state of the image
   */
  Image: (
    props: FrameImageProps & FrameUIStateProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered only if frame has at least one button
   */
  ButtonsContainer: (
    props: {
      buttons: ReactElement[];
    } & FrameUIStateProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  Button: (
    props: FrameButtonProps & FrameUIStateProps & { index: number },
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered only if frame has a text input
   */
  TextInputContainer: (
    props: {
      textInput: ReactElement;
      frame: FrameUIState;
    },
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered only if frame has a text input
   */
  TextInput: (
    props: FrameTextInputProps & FrameUIStateProps,
    stylingProps: TStylingProps
  ) => ReactElement;
  /**
   * Rendered in component.ImageContainer in case the frame button press returns a message
   */
  MessageTooltip: (
    props: FrameMessageTooltipProps & FrameUIStateProps,
    stylingProps: TStylingProps
  ) => ReactElement;
};

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
};

export type FrameTextInputProps = {
  isDisabled: boolean;
  placeholder: string;
  onChange: (text: string) => void;
  value?: string;
};

export type FrameMessageTooltipProps = {
  message: string;
  status: "error" | "message";
};
