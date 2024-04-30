import type { ImageResponse } from "@vercel/og";
import type { ClientProtocolId } from "../types";
import type { Button } from "./components";

export type JsonObject = { [Key in string]: JsonValue } & {
  [Key in string]?: JsonValue | undefined;
};

export type JsonArray = JsonValue[] | readonly JsonValue[];

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export type UnionToIntersection<Union> =
  // `extends unknown` is always going to be the case and is used to convert the
  // `Union` into a [distributive conditional
  // type](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types).
  (
    Union extends unknown
      ? // The union type is used as the only argument to a function since the union
        // of function arguments is an intersection.
        (distributedUnion: Union) => void
      : // This won't happen.
        never
  ) extends // Infer the `Intersection` type since TypeScript represents the positional
  // arguments of unions of functions as an intersection of the union.
  (mergedIntersection: infer Intersection) => void
    ? // The `& Union` is to allow indexing by the resulting type
      Intersection & Union
    : never;

/**
 * Default frames context
 *
 * This is just internal object, if we have some values that are provided by frames by default
 * we should define them in here.
 */
export type FramesContext<TState extends JsonValue | undefined = JsonValue> = {
  /**
   * All frame relative targets will be resolved relative to this
   */
  basePath: string;
  /**
   * URL resolved based on current request URL, baseUrl and basePath. This URL is used to generate target URLs.
   */
  baseUrl: URL;
  /**
   * Values passed to createFrames()
   */
  readonly initialState: TState;
  request: Request;
  /**
   * Current request URL
   */
  url: URL;
  stateSigningSecret?: string;
};

type AllowedFramesContextShape = Record<string, any>;

export type FrameButtonElement = React.ReactComponentElement<typeof Button>;
type AllowedFrameButtonItems = FrameButtonElement | null | undefined | boolean;

/**
 * Frame definition, this is rendered by the frames
 */
export type FrameDefinition<TState extends JsonValue | undefined> = {
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
  buttons?:
    | []
    | [AllowedFrameButtonItems]
    | [AllowedFrameButtonItems, AllowedFrameButtonItems]
    | [
        AllowedFrameButtonItems,
        AllowedFrameButtonItems,
        AllowedFrameButtonItems,
      ]
    | [
        AllowedFrameButtonItems,
        AllowedFrameButtonItems,
        AllowedFrameButtonItems,
        AllowedFrameButtonItems,
      ];
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
} & ResponseInit;

/**
 * Frame redirect, this should happen only in response to post_redirect button
 */
export type FrameRedirect = {
  kind: "redirect";
  location: string | URL;
} & ResponseInit;

export type FramesHandlerFunctionReturnType<
  TState extends JsonValue | undefined,
> = FrameDefinition<TState> | FrameRedirect | Response;

type FramesMiddlewareNextFunction<
  TState extends JsonValue | undefined,
  TReturnedContext extends AllowedFramesContextShape,
> = (context?: TReturnedContext) => FramesMiddlewareReturnType<TState>;

export type FramesMiddlewareReturnType<TState extends JsonValue | undefined> =
  Promise<
    | FramesHandlerFunctionReturnType<TState>
    | FramesHandlerFunctionReturnType<string> // this handles serialized state
  >;

export type FramesMiddleware<
  TState extends JsonValue | undefined,
  TReturnedContext extends AllowedFramesContextShape,
> = (
  context: FramesContext<TState>,
  next: FramesMiddlewareNextFunction<TState, TReturnedContext>
) => FramesMiddlewareReturnType<TState>;

export type FrameHandlerFunction<
  TState extends JsonValue | undefined,
  TFramesContext extends AllowedFramesContextShape,
> = (
  // we pass ctx.state here since it is made available internally by stateMiddleware but the inference would not work
  ctx: FramesContext<TState> & TFramesContext & { state: TState }
) =>
  | Promise<FramesHandlerFunctionReturnType<TState>>
  | FramesHandlerFunctionReturnType<TState>;

export type FramesContextFromMiddlewares<
  TMiddlewares extends
    | FramesMiddleware<any, any>[]
    | readonly FramesMiddleware<any, any>[],
> = UnionToIntersection<
  {
    [K in keyof TMiddlewares]: TMiddlewares[K] extends FramesMiddleware<
      any,
      infer Ctx
    >
      ? Ctx
      : never;
  }[number]
>;

export type FramesRequestHandlerFunctionOptions<
  TPerRouteFrameMiddlewares extends FramesMiddleware<any, any>[] | undefined,
> = {
  middleware?: TPerRouteFrameMiddlewares;
};

export type FramesRequestHandlerFunction<
  TState extends JsonValue | undefined,
  TDefaultMiddleware extends
    | readonly FramesMiddleware<any, any>[]
    | FramesMiddleware<any, any>[]
    | undefined,
  TFrameMiddleware extends FramesMiddleware<any, any>[] | undefined,
  TRequestHandlerFunction extends (...args: any[]) => any,
> = <
  TPerRouteMiddleware extends
    | FramesMiddleware<any, any>[]
    | undefined = undefined,
>(
  handler: FrameHandlerFunction<
    TState,
    (TDefaultMiddleware extends undefined
      ? Record<string, any>
      : FramesContextFromMiddlewares<NonNullable<TDefaultMiddleware>>) &
      (TFrameMiddleware extends undefined
        ? Record<string, any>
        : FramesContextFromMiddlewares<NonNullable<TFrameMiddleware>>) &
      (TPerRouteMiddleware extends undefined
        ? Record<string, any>
        : FramesContextFromMiddlewares<NonNullable<TPerRouteMiddleware>>)
  >,
  options?: FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
) => TRequestHandlerFunction;

export type FramesOptions<
  TState extends JsonValue | undefined,
  TFrameMiddleware extends FramesMiddleware<any, any>[] | undefined,
> = {
  /**
   * All frame relative targets will be resolved relative to this. `basePath` is always resolved relatively to baseUrl (if provided). If `baseUrl` is not provided then `basePath` overrides the path part of current request's URL.
   *
   * @example
   * ```ts
   * {
   *  basePath: '/foo'
   * }
   *
   * // if the request URL is http://mydomain.dev/bar then context.url will be set to http://mydomain.dev/foo
   * // if the request URL is http://mydomain.dev/ then context.url will be set to http://mydomain.dev/foo
   * ```
   *
   * @example
   * ```ts
   * {
   *  basePath: '/foo',
   *  baseUrl: 'http://mydomain.dev'
   * }
   *
   * // context.url will be set to http://mydomain.dev/foo
   * ```
   *
   * @example
   * ```ts
   * {
   *  basePath: '/foo',
   *  baseUrl: 'http://localhost:3000/test'
   * }
   *
   * // context.url will be set to http://localhost:3000/test/foo
   * ```
   *
   * @defaultValue '/'
   */
  basePath?: string;
  /**
   * Overrides the detected URL of the request. URL is used in combination with `basePath` to generate target URLs for Buttons.
   * Provided value must be full valid URL with protocol and domain. `basePath` if provided is resolved relatively to this URL.
   * This is useful if the URL detection fails to recognize the correct URL or if you want to override it.
   *
   * This URL also overrides the request.url value with the provided value.
   *
   * @example
   * ```ts
   * // using string, the value of ctx.url and request.url will be set to this value
   * {
   *  baseUrl: 'https://example.com',
   * }
   * ```
   *
   * @example
   * ```ts
   * // using URL, the value of ctx.url and request.url will be set to this value
   * {
   *  baseUrl: new URL('https://example.com'),
   * }
   * ```
   */
  baseUrl?: string | URL;
  /**
   * Initial state, used if no state is provided in the message or you are on initial frame.
   *
   * Value must be JSON serializable
   */
  initialState?: TState;
  middleware?: TFrameMiddleware extends undefined
    ? FramesMiddleware<any, any>[]
    : TFrameMiddleware;
  /**
   * If provided the state will be signed with this secret and validated on subsequent requests.
   * If the signature is not valid, error is thrown.
   */
  stateSigningSecret?: string;
};

export type CreateFramesFunctionDefinition<
  TDefaultMiddleware extends
    | readonly FramesMiddleware<any, any>[]
    | FramesMiddleware<any, any>[]
    | undefined,
  TRequestHandlerFunction extends (...args: any[]) => any,
> = <
  TState extends JsonValue | undefined = JsonValue | undefined,
  TFrameMiddleware extends FramesMiddleware<any, any>[] | undefined = undefined,
>(
  options?: FramesOptions<TState, TFrameMiddleware>
) => FramesRequestHandlerFunction<
  TState,
  TDefaultMiddleware,
  TFrameMiddleware,
  TRequestHandlerFunction
>;
