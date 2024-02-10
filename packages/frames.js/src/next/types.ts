import { ActionIndex, FrameActionPayload } from "../types";

/**
 * A subset of HTTP request headers provided to the server request
 */
export type HeadersList = {
  /** user-agent header */
  userAgent: string | null;
  acceptLanguage: string | null;
  /** for example: /maps */
  pathname: string | null;
  /** for example: https://www.google.com/maps */
  url: string | null;
  /** for example: www.google.com */
  host: string | null;
  /** for example: https://www.google.com */
  urlWithoutPathname: string | null;
};

/** A subset of JS objects that are serializable */
type AnyJson = boolean | number | string | null | JsonArray | JsonMap;
interface JsonMap {
  [key: string]: AnyJson;
}
interface JsonArray extends Array<AnyJson> {}

/**
 * FrameState constraints
 * - must be short - combined with the post_url has a max length of 256 bytes
 * - it must be serializable (no circular references)
 * - it should be considered untrusted - anyone could share or modify the url
 */
export type FrameState = AnyJson;

/**
 * A Map from buttonIndex to href url, used to represent the previous Frames redirection state, in order to handle redirect requests.
 * Keys that start with an underscore are unspecified hrefs that must be handled in the POST router
 */
export type RedirectMap = Record<number | `_${number}`, string>;

/**
 * A representation of the previous frame, used in order to enable state transitions and redirects.
 */
export type PreviousFrame<T extends FrameState = FrameState> = {
  /** the body of the `POST` request of a button click, including what button the user pressed and the signature */
  postBody: FrameActionPayload | null;
  /** the previous Frame's state, before the user pressed the button */
  prevState: T | null;
  /** the previous Frame's redirects */
  prevRedirects: RedirectMap | null;
  /** the previous Frame's pathname */
  pathname?: string;
  /** some of the headers present on the `POST` request received of the user action */
  headers: HeadersList;
};

/**
 * Similar to React useReducer's first argument. A state machine that takes a state the previous Frame's action data and returns a new state. Used for a reducer. @returns the url to redirect to, or undefined if this url doesn't redirect
 */
export type RedirectHandler = (action: PreviousFrame) => string | undefined;

/**
 * Similar to React useReducer's first argument. A state machine that takes a state the previous Frame's action data and returns a new state
 */
export type FrameReducer<T extends FrameState = FrameState> = (
  state: T,
  action: PreviousFrame
) => T;

/**
 * These props are automatically added to children of <FrameContainer> in order to correctly assign `buttonIndex` to `<FrameButton>`s
 */
export type FrameButtonAutomatedProps = {
  /** The buttonIndex of the button, which will be passed in the POST requests if the user presses on it */
  actionIndex: ActionIndex;
};

/**
 * Does nothing at the moment, but may be used in the future. It also makes the syntax more logical, as it seems like `Button` `onClick` actually dispatches a state transition, although in reality it works differently.
 */
export type Dispatch = (actionIndex: ActionIndex) => any;

export type FrameButtonProvidedProps = (
  | FrameButtonPostRedirectProvidedProps
  | FrameButtonPostProvidedProps
  | FrameButtonMintProvidedProps
  | FrameButtonLinkProvidedProps
) & {
  /** defaults to post */
  action?: "post" | "link" | "mint" | "post_redirect";
};

export type FrameButtonPostProvidedProps = {
  /** a label to display on the button */
  children: string | number;
  action?: "post";
  /** an absolute url to post to. If not defined */
  target?: string;
};

export type FrameButtonLinkProvidedProps = {
  /** a label to display on the button */
  children: string | number;
  action: "link";
  /** an absolute url to redirect users to */
  target?: string;
};

export type FrameButtonPostRedirectProvidedProps = {
  /** a label to display on the button */
  children: string | number;
  action: "post_redirect";
  /** an absolute url to redirect users to */
  target?: string;
};

export type FrameButtonMintProvidedProps = {
  /** a label to display on the button */
  children: string | number;
  action: "mint";
  /** a [CAIP-10](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md) url to an NFT smart contract or token */
  target: string;
};

/** See https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional */
export type NextServerPageProps = {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};
