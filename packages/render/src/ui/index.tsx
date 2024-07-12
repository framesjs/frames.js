import React, {
  type ChangeEvent,
  createElement as reactCreateElement,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { BaseFrameUI, type BaseFrameUIProps } from "./frame.base";
import type {
  FrameRootContainerProps,
  FrameUIComponents,
  RootContainerElement,
} from "./types";

declare module "react" {
  interface CSSProperties {
    "--frame-image-aspect-ratio"?: string;
  }
}

type StylingProps = {
  className?: string;
  style?: React.CSSProperties;
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
    const elementRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => {
      return {
        computeDimensions() {
          if (!elementRef.current) {
            return undefined;
          }

          const { width, height } = elementRef.current.getBoundingClientRect();

          return { width, height };
        },
      };
    });

    return createElement(
      "div",
      {
        className,
        ref: elementRef,
        style: { ...dimensions, ...style },
      },
      loadingScreen,
      imageContainer,
      textInputContainer,
      buttonsContainer
    );
  }
);

RootContainer.displayName = "RootContainer";

function isCssProperties(value: unknown): value is React.CSSProperties {
  return typeof value === "object" && value !== null;
}

function createDefaultComponents<TStylingProps extends Record<string, unknown>>(
  createElement = reactCreateElement
): FrameUIComponents<TStylingProps> {
  return {
    Button(props, stylingProps) {
      const label = (
        <>
          {props.frameButton.action === "mint" && "⬗ "}
          {props.frameButton.label}
          {props.frameButton.action === "tx" && (
            <svg
              aria-hidden="true"
              focusable="false"
              role="img"
              viewBox="0 0 16 16"
              className="ml-1 mb-[2px] text-gray-400 inline-block select-none align-text-middle overflow-visible"
              width="12"
              height="12"
              fill="currentColor"
            >
              <path d="M9.504.43a1.516 1.516 0 0 1 2.437 1.713L10.415 5.5h2.123c1.57 0 2.346 1.909 1.22 3.004l-7.34 7.142a1.249 1.249 0 0 1-.871.354h-.302a1.25 1.25 0 0 1-1.157-1.723L5.633 10.5H3.462c-1.57 0-2.346-1.909-1.22-3.004L9.503.429Zm1.047 1.074L3.286 8.571A.25.25 0 0 0 3.462 9H6.75a.75.75 0 0 1 .694 1.034l-1.713 4.188 6.982-6.793A.25.25 0 0 0 12.538 7H9.25a.75.75 0 0 1-.683-1.06l2.008-4.418.003-.006a.036.036 0 0 0-.004-.009l-.006-.006-.008-.001c-.003 0-.006.002-.009.004Z" />
            </svg>
          )}
          {(props.frameButton.action === "post_redirect" ||
            props.frameButton.action === "link") &&
            ` ↗`}
        </>
      );

      return createElement(
        "button",
        {
          ...stylingProps,
          key: props.index,
          disabled: props.isDisabled,
          onClick: props.onPress,
          type: "button",
        },
        label
      );
    },
    ButtonsContainer(props, stylingProps) {
      return createElement("div", stylingProps, props.buttons);
    },
    Error(props, stylingProps) {
      return createElement("div", stylingProps, props.message);
    },
    Image(props, stylingProps) {
      const aspectRatio = props.aspectRatio.replace(":", "/");

      return createElement("img", {
        ...stylingProps,
        "data-aspect-ratio": aspectRatio,
        style: {
          "--frame-image-aspect-ratio": aspectRatio,
          ...(isCssProperties(stylingProps.style) && stylingProps.style),
        },
        onLoad: props.onImageLoadEnd,
        onError: props.onImageLoadEnd,
        src: props.status === "frame-loading" ? undefined : props.src,
        alt: "Frame",
      });
    },
    ImageContainer(props, stylingProps) {
      const aspectRatio = props.aspectRatio.replace(":", "/");

      return createElement(
        "div",
        {
          ...stylingProps,
          style: {
            "--frame-image-aspect-ratio": aspectRatio,
            ...(isCssProperties(stylingProps.style) && stylingProps.style),
          },
        },
        props.image,
        props.messageTooltip
      );
    },
    LoadingScreen(props, stylingProps) {
      return createElement("div", stylingProps, "Loading...");
    },
    MessageTooltip(props, stylingProps) {
      return createElement(
        "div",
        { ...stylingProps, "data-status": props.status },
        props.message
      );
    },
    Root(props, stylingProps) {
      return createElement(RootContainer, { ...props, ...stylingProps });
    },
    TextInput(props, stylingProps) {
      return createElement("input", {
        ...stylingProps,
        disabled: props.isDisabled,
        onChange: (e: ChangeEvent<HTMLInputElement>) => {
          props.onChange(e.target.value);
        },
        placeholder: props.placeholder,
        value: props.value,
        type: "text",
      });
    },
    TextInputContainer(props, stylingProps) {
      return createElement("div", stylingProps, props.textInput);
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
