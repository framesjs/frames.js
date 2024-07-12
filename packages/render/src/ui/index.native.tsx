import React, {
  createElement as reactCreateElement,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  Button,
  Image,
  type ImageStyle,
  type LayoutChangeEvent,
  Text,
  TextInput,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { BaseFrameUI, type BaseFrameUIProps } from "./frame.base";
import type {
  FrameRootContainerProps,
  FrameUIComponents,
  RootContainerDimensions,
  RootContainerElement,
} from "./types";

type StylingProps = {
  /**
   * Nativewind support
   */
  className?: string;
  style?: ViewStyle | ImageStyle | TextStyle;
};

const RootContainer = forwardRef<
  RootContainerElement,
  FrameRootContainerProps & StylingProps
>(
  (
    {
      createElement,
      buttonsContainer,
      imageContainer,
      loadingScreen,
      textInputContainer,
      dimensions,
      className,
      style,
    },
    ref
  ) => {
    const viewDimensionsRef = useRef<RootContainerDimensions | undefined>();

    useImperativeHandle(ref, () => {
      return {
        computeDimensions() {
          return viewDimensionsRef.current;
        },
      };
    });

    return createElement(
      View,
      {
        // @ts-expect-error -- this is supported if nativewind is used
        className,
        onLayout: (e: LayoutChangeEvent) => {
          viewDimensionsRef.current = {
            height: e.nativeEvent.layout.height,
            width: e.nativeEvent.layout.width,
          };
        },
        style: {
          ...dimensions,
          ...style,
        },
      },
      loadingScreen,
      imageContainer,
      textInputContainer,
      buttonsContainer
    );
  }
);

RootContainer.displayName = "RootContainer";

function isStyleProp<TStyle extends ViewStyle | ImageStyle | TextStyle>(
  value: unknown
): value is TStyle {
  return typeof value === "object" && value !== null;
}

function createDefaultComponents<TStylingProps extends Record<string, unknown>>(
  createElement = reactCreateElement
): FrameUIComponents<TStylingProps> {
  return {
    Button(props, stylingProps) {
      return createElement(Button, {
        ...stylingProps,
        disabled: props.isDisabled,
        onPress: props.onPress,
        title: props.frameButton.label,
      });
    },
    ButtonsContainer(props, stylingProps) {
      return createElement(View, stylingProps, props.buttons);
    },
    Error(props, stylingProps) {
      return createElement(
        View,
        stylingProps,
        createElement(Text, null, props.message)
      );
    },
    Image(props, stylingProps) {
      const aspectRatio = props.aspectRatio.replace(":", "/");

      if (props.status === "frame-loading") {
        return createElement(View);
      }

      return createElement(Image, {
        ...stylingProps,
        style: {
          aspectRatio,
          ...(isStyleProp<ImageStyle>(stylingProps.style) &&
            stylingProps.style),
        },
        src: props.src,
        alt: "Frame",
      });
    },
    ImageContainer(props, stylingProps) {
      const aspectRatio = props.aspectRatio.replace(":", "/");

      return createElement(
        View,
        {
          ...stylingProps,
          style: {
            aspectRatio,
            ...(isStyleProp<ViewStyle>(stylingProps.style) &&
              stylingProps.style),
          },
        },
        props.image,
        props.messageTooltip
      );
    },
    LoadingScreen(props, stylingProps) {
      return createElement(
        View,
        stylingProps,
        createElement(Text, null, "Loading...")
      );
    },
    MessageTooltip(props, stylingProps) {
      return createElement(
        View,
        stylingProps,
        createElement(Text, null, props.message)
      );
    },
    Root(props, stylingProps) {
      return createElement(RootContainer, {
        ...props,
        ...stylingProps,
        createElement,
      });
    },
    TextInput(props, stylingProps) {
      return createElement(TextInput, {
        ...stylingProps,
        editable: !props.isDisabled,
        onChangeText: props.onChange,
        placeholder: props.placeholder,
        value: props.value,
      });
    },
    TextInputContainer(props, stylingProps) {
      return createElement(View, stylingProps, props.textInput);
    },
  };
}

type FrameUIProps<TStylingProps extends Record<string, unknown>> = Omit<
  BaseFrameUIProps<TStylingProps>,
  "components"
> & {
  /**
   * Components should be memoized to avoid re-rendering the entire UI
   */
  components?: Partial<FrameUIComponents<TStylingProps>>;
};

export function FrameUI<
  TStylingProps extends Record<string, unknown> = StylingProps,
>(props: FrameUIProps<TStylingProps>): JSX.Element {
  const defaultComponents = useMemo(
    () => createDefaultComponents<TStylingProps>(props.createElement),
    [props.createElement]
  );
  const components = useMemo(() => {
    return {
      ...defaultComponents,
      ...props.components,
    };
  }, [defaultComponents, props.components]);

  return <BaseFrameUI<TStylingProps> {...props} components={components} />;
}
