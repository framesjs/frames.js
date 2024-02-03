import React from "react";
import { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { ActionIndex, FrameActionPayload } from "../types";

export type FrameState = Record<string, string>;

export type RedirectMap = Record<number, string>;

export type FrameContext<T extends FrameState = FrameState> = {
  frame_action_received: FrameActionPayload | null;
  frame_prev_state: T | null;
  frame_prev_redirects: RedirectMap | null;
  pathname?: string;
  url: string;
  headers: ReadonlyHeaders;
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
