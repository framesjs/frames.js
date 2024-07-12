import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
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

function isStyleProp<TStyle extends ViewStyle | ImageStyle | TextStyle>(
  value: unknown
): value is TStyle {
  return typeof value === "object" && value !== null;
}

function createDefaultComponents<
  TStylingProps extends Record<string, unknown>,
>(): FrameUIComponents<TStylingProps> {
  return {
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
        <View
          {...stylingProps}
          style={{
            aspectRatio,
            ...(isStyleProp<ViewStyle>(stylingProps.style) &&
              stylingProps.style),
          }}
        >
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
}

type FrameUIProps<TStylingProps extends Record<string, unknown>> = Omit<
  BaseFrameUIProps<TStylingProps>,
  "components" | "theme"
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
    () => createDefaultComponents<TStylingProps>(),
    []
  );
  const components = useMemo(() => {
    return {
      ...defaultComponents,
      ...props.components,
    };
  }, [defaultComponents, props.components]);

  return <BaseFrameUI<TStylingProps> {...props} components={components} />;
}
