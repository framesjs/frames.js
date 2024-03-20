import { JsonValue } from "./types";

type PostButtonProps = {
  /** A 256-byte string which is label of the button */
  children: string;
  action: "post";
  /**
   * Either full URL or relative path that will be resolved against current url and basePath
   * if omitted it will send use current url and path
   */
  target?: string;
  /**
   * State passed to the next frame, will be available on the context as clickedButton.state
   */
  state?: JsonValue;
};

type PostRedirectButton = {
  /** A 256-byte string which is label of the button */
  children: string;
  action: "post_redirect";
  /**
   * Either full URL or relative path that will be resolved against current url and basePath
   * if omitted it will send use current url and path
   */
  target?: string;
  /**
   * State passed to the next frame
   *
   * State passed to the next frame, will be available on the context as clickedButton.state
   */
  state?: JsonValue;
};

type MintButtonProps = {
  /** A 256-byte string which is label of the button */
  children: string;
  action: "mint";
  /** The target  property MUST be a valid [CAIP-10](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md) address, plus an optional token_id . */
  target: string;
};

type LinkButtonProps = {
  /** A 256-byte string which is label of the button */
  children: string;
  action: "link";
  target: string;
};

type TxButtonProps = {
  /** A 256-byte string which is label of the button */
  children: string;
  action: "tx";
  /** URL which points to a valid Frame Transaction URL, which returns tx calldata */
  target: string;
  /** Overrides the top level frame post_url */
  post_url?: string;
};

export type ButtonProps =
  | PostButtonProps
  | PostRedirectButton
  | MintButtonProps
  | LinkButtonProps
  | TxButtonProps;

export const Button: React.FunctionComponent<ButtonProps> = () => {
  return null;
};
