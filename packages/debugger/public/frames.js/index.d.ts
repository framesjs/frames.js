type JsonObject = { [Key in string]: JsonValue } & {
  [Key in string]?: JsonValue | undefined;
};

type JsonArray = JsonValue[] | readonly JsonValue[];
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type ClientProtocolId = { id: string; version: string };

type RemapChildrenToLabelProps<T> = T extends any
  ? Omit<T, "children"> & {
      /** A 256-byte string which is label of the button */
      label: string;
    }
  : never;

type FramePlainObjectButtonElement = RemapChildrenToLabelProps<ButtonProps>;
type FrameButtonElement = React.ReactElement<ButtonProps, typeof Button>;

type AllowedFrameButtonItems =
  | FramePlainObjectButtonElement
  | FrameButtonElement
  | null
  | undefined
  | boolean;

/**
 * Frame definition, this is rendered by the frames
 */
type FrameDefinition<TState extends JsonValue | undefined> = {
  /**
   * If string then it must be a valid URL
   */
  image: React.ReactElement | string;
  imageOptions?: {
    /**
     * @defaultValue '1.91:1'
     */
    aspectRatio?: "1.91:1" | "1:1";
  } & ConstructorParameters<typeof ImageResponse>[1];
  /**
   * Up to 4 buttons are allowed. If more are provided error is returned.
   */
  buttons?: AllowedFrameButtonItems[];
  /**
   * Label for text input, if no value is provided the input is not rendered
   */
  textInput?: string;
  /**
   * Global app state that will be available on next frame
   */
  state?: TState;
  /**
   * Open Frames spec: The minimum client protocol version accepted for the given protocol identifier. For example VNext, or 1.5 . At least one $protocol_identifier must be specified.
   */
  accepts?: ClientProtocolId[];
};

type PostButtonProps = {
  /** A 256-byte string which is label of the button */
  children: string;
  action: "post";
  /**
   * Either full URL or relative path that will be resolved against current url and basePath
   * if omitted it will send use current url and path. Optionally pass in an object with properties `pathname`, `query`, ... instead.
   */
  target?: string | UrlObject;
};

type PostRedirectButton = {
  /** A 256-byte string which is label of the button */
  children: string;
  action: "post_redirect";
  /**
   * Either full URL or relative path that will be resolved against current url and basePath
   * if omitted it will send use current url and path. Optionally pass in an object with properties `pathname`, `query`, ... instead.
   */
  target?: string | UrlObject;
};

type MintButtonProps = {
  /** A 256-byte string which is label of the button */
  children: string;
  action: "mint";
  /** The target  property MUST be a valid [CAIP-10](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md) address, plus an optional token_id. */
  target: string;
};

type LinkButtonProps = {
  /** A 256-byte string which is label of the button */
  children: string;
  action: "link";
  /** A Url to link to. Optionally pass in an object with properties `pathname`, `query`, ... instead. */
  target: string | UrlObject;
};

type TxButtonProps = {
  /** A 256-byte string which is label of the button */
  children: string;
  action: "tx";
  /**
   * URL which points to a valid Frame Transaction URL, which returns tx calldata.
   *
   * Either full URL or relative path that will be resolved against current url and basePath
   * if omitted it will send use current url and path
   */
  target: string | UrlObject;
  /**
   * URL where a frame message containing the transaction ID will be posted if the transaction succeeds.
   * Overrides the top level frame post_url.
   */
  post_url?: string | UrlObject;
};

type ButtonProps =
  | PostButtonProps
  | PostRedirectButton
  | MintButtonProps
  | LinkButtonProps
  | TxButtonProps;

function Button(_: ButtonProps): null {
  return null;
}
