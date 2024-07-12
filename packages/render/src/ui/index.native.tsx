import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  Button,
  Image,
  type ImageStyle,
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
  FrameUIComponentStylingProps,
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

    return (
      <View
        // @ts-expect-error -- this is supported if nativewind is used
        className={className}
        onLayout={(e) => {
          viewDimensionsRef.current = {
            height: e.nativeEvent.layout.height,
            width: e.nativeEvent.layout.width,
          };
        }}
        style={{
          ...dimensions,
          ...style,
        }}
      >
        {loadingScreen}
        {imageContainer}
        {textInputContainer}
        {buttonsContainer}
      </View>
    );
  }
);

RootContainer.displayName = "RootContainer";

const defaultComponents: FrameUIComponents<StylingProps> = {
  Button(props, stylingProps) {
    return (
      <Button
        {...stylingProps}
        disabled={props.isDisabled}
        onPress={props.onPress}
        title={props.frameButton.label}
      />
    );
  },
  ButtonsContainer(props, stylingProps) {
    return <View {...stylingProps}>{props.buttons}</View>;
  },
  Error(props, stylingProps) {
    return (
      <View {...stylingProps}>
        <Text>{props.message}</Text>
      </View>
    );
  },
  Image(props, stylingProps) {
    const aspectRatio = props.aspectRatio.replace(":", "/");

    if (props.status === "frame-loading") {
      return <View />;
    }

    return (
      <Image
        {...stylingProps}
        style={{
          aspectRatio,
          ...(stylingProps.style as ImageStyle | undefined),
        }}
        src={props.src}
        alt="Frame"
      />
    );
  },
  ImageContainer(props, stylingProps) {
    const aspectRatio = props.aspectRatio.replace(":", "/");

    return (
      <View {...stylingProps} style={{ aspectRatio, ...stylingProps.style }}>
        {props.image}
        {props.messageTooltip}
      </View>
    );
  },
  LoadingScreen(props, stylingProps) {
    return (
      <View {...stylingProps}>
        <Text>Loading...</Text>
      </View>
    );
  },
  MessageTooltip(props, stylingProps) {
    return (
      <View {...stylingProps}>
        <Text>{props.message}</Text>
      </View>
    );
  },
  Root(props, stylingProps) {
    return <RootContainer {...props} {...stylingProps} />;
  },
  TextInput(props, stylingProps) {
    return (
      <TextInput
        {...stylingProps}
        editable={!props.isDisabled}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        value={props.value}
      />
    );
  },
  TextInputContainer(props, stylingProps) {
    return <View {...stylingProps}>{props.textInput}</View>;
  },
};

const defaultStyles: FrameUIComponentStylingProps<StylingProps> = {
  Button: {},
  ButtonsContainer: {},
  Error: {},
  Image: {},
  ImageContainer: {},
  LoadingScreen: {},
  MessageTooltip: {},
  Root: {},
  TextInput: {},
  TextInputContainer: {},
};

type StyledBaseUIProps = BaseFrameUIProps<StylingProps>;
type FrameUIProps = Omit<StyledBaseUIProps, "components" | "theme"> & {
  components?: Partial<StyledBaseUIProps["components"]>;
  theme?: Partial<StyledBaseUIProps["theme"]>;
};

export function FrameUI(props: FrameUIProps): JSX.Element {
  const components = {
    ...defaultComponents,
    ...props.components,
  };

  const theme = {
    ...defaultStyles,
    ...props.theme,
  };

  return <BaseFrameUI {...props} components={components} theme={theme} />;
}
