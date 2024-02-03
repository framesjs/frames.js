import React, { useCallback } from "react";
import { ActionIndex } from "./types";

type FrameState = Record<string, string>;

export function FFrame({
  children,
  postUrl,
}: {
  postUrl: string;
  children: Array<
    | React.ReactElement<typeof FFrameButton>
    | React.ReactElement<typeof FFrameImage>
  >;
}) {
  let nextButtonIndex: ActionIndex = 1;
  let hasImage = false;
  const newTree = (
    <>
      <meta name="fc:frame" content="vNext" />
      <meta name="fc:frame:post_url" content={postUrl} />
      {React.Children.map(children, (child) => {
        switch (child.type) {
          case FFrameButton:
            if (!React.isValidElement<typeof FFrameButton>(child)) {
              return child;
            }

            if (child.props.hasOwnProperty("href")) {
              return (
                <FFrameRedirect
                  {...(child.props as any)}
                  actionIndex={nextButtonIndex++}
                />
              );
            } else {
              return (
                <FFrameButtonShim
                  {...(child.props as any)}
                  actionIndex={nextButtonIndex++}
                />
              );
            }
          case FFrameImage:
            hasImage = true;
            return child;
          default:
            throw new Error(
              "invalid child of <Frame>, must be a <FrameButton> or <FrameImage>"
            );
        }
      })}
    </>
  );

  if (!hasImage)
    throw new Error("an <FrameImage> element inside a <Frame> is required");

  return newTree;
}

type FrameButtonAutomatedProps = {
  actionIndex: ActionIndex;
};

type FrameButtonProvidedProps =
  | FrameButtonPostRedirectProvidedProps
  | FrameButtonPostProvidedProps;

type FrameButtonPostProvidedProps = {
  onClick: () => FrameState;
  children: string | number;
};
type FrameButtonPostRedirectProvidedProps = {
  href: string;
  children: string | number;
};

function getUrlFromOnClick(frameState: FrameState) {
  return `?state=${encodeURIComponent(JSON.stringify(frameState))}`;
}

export function FFrameRedirect({
  actionIndex,
  children,
}: FrameButtonPostRedirectProvidedProps & FrameButtonAutomatedProps) {
  return (
    <>
      <meta
        name={`fc:frame:button:${actionIndex}`}
        content={String(children)}
      />
      <meta
        name={`fc:frame:button:${actionIndex}:action`}
        content={"post_redirect"}
      />
    </>
  );
}

export function FFrameButton(props: FrameButtonProvidedProps) {
  return null;
}

export function FFrameButtonShim({
  actionIndex,
  children,
  onClick,
}: FrameButtonPostProvidedProps & FrameButtonAutomatedProps) {
  const url = getUrlFromOnClick(onClick);
  return (
    <>
      <meta
        name={`fc:frame:button:${actionIndex}`}
        content={String(children)}
      />
      <meta name={`fc:frame:button:${actionIndex}:action`} content={"post"} />
    </>
  );
}

export function FFrameImage({ src }: { src: string }) {
  return (
    <>
      <meta name="fc:frame:image" content={src} />
      <meta property="og:image" content={src} />
    </>
  );
}
