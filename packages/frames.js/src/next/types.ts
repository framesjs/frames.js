import { ActionIndex, FrameActionPayload } from "../types";

export type HeadersList = {
  userAgent: string | null;
  acceptLanguage: string | null;
  pathname: string | null;
  url: string | null;
  host: string | null;
};

export type FrameState = Record<string, string>;

export type RedirectMap = Record<number, string>;

export type FrameContext<T extends FrameState = FrameState> = {
  postBody: FrameActionPayload | null;
  prevState: T | null;
  prevRedirects: RedirectMap | null;
  pathname?: string;
  headers: HeadersList;
};

type StringifiedValues<T> = {
  [K in keyof T]?: string;
};

export type FFrameUrlSearchParamsFlattened = StringifiedValues<FrameContext>;

export type FrameReducer<T extends FrameState = FrameState> = (
  state: T,
  action: FrameContext
) => T;

export type FrameButtonAutomatedProps = {
  actionIndex: ActionIndex;
};

export type Dispatch = (actionIndex: ActionIndex) => any;

export type FrameButtonProvidedProps =
  | FrameButtonPostRedirectProvidedProps
  | FrameButtonPostProvidedProps;

export type FrameButtonPostProvidedProps = {
  children: string | number;
  onClick: Dispatch;
};
export type FrameButtonPostRedirectProvidedProps = {
  href: string;
  children: string | number;
};
