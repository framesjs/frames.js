import { createContext, useContext } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as newApi from "./new-api";
import { FrameActionDataParsedAndHubContext } from "frames.js";

type FrameImageProps = {
  children: React.ReactElement;
};

/**
 * This component throws a promise so we don't need to use server components and it is possible to use it in any app (Next, Remix, Express)
 * with our renderFrames function.
 */
export function FrameImage({ children }: FrameImageProps) {
  const frame = useContext(FrameContext);

  if (!frame) {
    throw new Error("FrameImage must be used inside a Frame");
  }

  frame.registerImage(children);

  return null;
}

type FrameLinkProps = {
  path: `/${string}`;
  label: string;
  /**
   * State send to next frame in case this button is clicked
   */
  state?: newApi.AnyJson;
};

export function FrameLink({ path, label }: FrameLinkProps) {
  const frame = useContext(FrameContext);

  if (!frame) {
    throw new Error("FrameLink must be used inside a Frame");
  }

  frame.registerPostButton(path, label);

  return null;
}

type FramePostRedirectButtonProps = {};

export function FramePostRedirectButton(props: FramePostRedirectButtonProps) {
  return <></>;
}

type FrameExternalLinkProps = {};

export function FrameExternalLink(props: FrameExternalLinkProps) {
  return <></>;
}

type FrameMintButtonProps = {};

export function FrameMintButton(props: FrameMintButtonProps) {
  return <></>;
}

type FramesAppProps = {
  /**
   * @default {}
   */
  initialState?: newApi.JsonMap;
  children: React.ReactElement<FrameProps> | React.ReactElement<FrameProps>[];
};

export function FramesApp({ initialState = {} }: FramesAppProps) {
  const app = useContext(FramesAppContext);

  app.setInitialState(initialState);

  return <></>;
}

const FrameContext = createContext<newApi.Frame>(null as any);

type AllowedFrameChildren =
  | React.ReactComponentElement<typeof FrameImage>
  | React.ReactComponentElement<typeof FrameLink>
  | React.ReactComponentElement<typeof FrameExternalLink>
  | React.ReactComponentElement<typeof FrameMintButton>
  | React.ReactComponentElement<typeof FramePostRedirectButton>;

type FrameRenderFunctionParams = {
  app: newApi.FramesApp;
  /**
   * If undefined there was no state detected (either no button has been clicked or button is not setting the state)
   */
  frameState: newApi.AnyJson | undefined;
  /**
   * Frame message from current request (set only if POST request and is containing the message)
   */
  frameMessage: FrameActionDataParsedAndHubContext | null;
};
type FrameRenderFunction = (
  params: FrameRenderFunctionParams
) => AllowedFrameChildren | AllowedFrameChildren[];

type FrameProps =
  | {
      index: true;
      children:
        | AllowedFrameChildren
        | AllowedFrameChildren[]
        | FrameRenderFunction;
    }
  | {
      path: `/${string}`;
      children:
        | AllowedFrameChildren
        | AllowedFrameChildren[]
        | FrameRenderFunction;
    };

export function Frame(props: FrameProps) {
  const app = useContext(FramesAppContext);
  const parentFrame = useContext(FrameContext);

  if (parentFrame) {
    throw new Error("Frame cannot be nested");
  }

  let frame: newApi.Frame;

  if ("index" in props) {
    frame = app.registerFrame("/");
  } else {
    frame = app.registerFrame(props.path);
  }

  return (
    <FrameContext.Provider value={frame}>
      {typeof props.children === "function"
        ? props.children({
            app,
            frameState: frame.getState(),
            frameMessage: app.getFrameMessage(),
          })
        : props.children}
    </FrameContext.Provider>
  );
}

const FramesAppContext = createContext<newApi.FramesApp>({} as any);

export async function renderFramesToResponse(
  app: React.ReactComponentElement<typeof FramesApp>,
  req: Request
): Promise<Response> {
  const _app = new newApi.FramesApp();

  try {
    renderToStaticMarkup(
      <FramesAppContext.Provider value={_app}>{app}</FramesAppContext.Provider>
    );

    return _app.renderToResponse(req);
  } catch (e) {
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
