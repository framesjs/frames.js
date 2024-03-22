import { ImageResponse } from "@vercel/og";
import { ClientProtocolId } from "..";
import { Button } from "./components";

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
   * Values passed to createFrames()
   */
  readonly initialState: TState;
  request: Request;
  searchParams: { [s: string]: string };
  /**
   * Current request URL
   */
  currentURL: URL;
};

type AllowedFramesContextShape = Record<string, any>;

type FrameButtonElement = React.ReactComponentElement<typeof Button>;

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
     * @default '1.91:1'
     */
    aspectRatio?: "1.91:1" | "1:1";
  } & ConstructorParameters<typeof ImageResponse>[1];
  buttons?:
    | []
    | [FrameButtonElement]
    | [FrameButtonElement, FrameButtonElement]
    | [FrameButtonElement, FrameButtonElement, FrameButtonElement]
    | [
        FrameButtonElement,
        FrameButtonElement,
        FrameButtonElement,
        FrameButtonElement,
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
> = FrameDefinition<TState> | FrameRedirect;

type FramesMiddlewareNextFunction<
  TState extends JsonValue | undefined,
  TReturnedContext extends AllowedFramesContextShape,
> = (context?: TReturnedContext) => FramesMiddlewareReturnType<TState>;

export type FramesMiddlewareReturnType<TState extends JsonValue | undefined> =
  Promise<FramesHandlerFunctionReturnType<TState> | Response>;

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
) => Promise<FramesHandlerFunctionReturnType<TState>>;

export type FramesContextFromMiddlewares<
  TMiddlewares extends
    | FramesMiddleware<any, any>[]
    | ReadonlyArray<FramesMiddleware<any, any>>,
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
    | ReadonlyArray<FramesMiddleware<any, any>>
    | FramesMiddleware<any, any>[]
    | undefined,
  TFrameMiddleware extends FramesMiddleware<any, any>[] | undefined,
  TRequestHandlerFunction extends Function,
> = <
  TPerRouteMiddleware extends
    | FramesMiddleware<any, any>[]
    | undefined = undefined,
>(
  handler: FrameHandlerFunction<
    TState,
    (TDefaultMiddleware extends undefined
      ? {}
      : FramesContextFromMiddlewares<NonNullable<TDefaultMiddleware>>) &
      (TFrameMiddleware extends undefined
        ? {}
        : FramesContextFromMiddlewares<NonNullable<TFrameMiddleware>>) &
      (TPerRouteMiddleware extends undefined
        ? {}
        : FramesContextFromMiddlewares<NonNullable<TPerRouteMiddleware>>)
  >,
  options?: FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
) => TRequestHandlerFunction;

export type FramesOptions<
  TState extends JsonValue | undefined,
  TFrameMiddleware extends FramesMiddleware<any, any>[] | undefined,
> = {
  /**
   * All frame relative targets will be resolved relative to this
   * @default '/''
   */
  basePath?: string;
  /**
   * Initial state, used if no state is provided in the message or you are on initial frame.
   *
   * Value must be JSON serializable
   */
  initialState?: TState;
  middleware?: TFrameMiddleware extends undefined
    ? FramesMiddleware<any, any>[]
    : TFrameMiddleware;
};

export type CreateFramesFunctionDefinition<
  TDefaultMiddleware extends
    | ReadonlyArray<FramesMiddleware<any, any>>
    | FramesMiddleware<any, any>[]
    | undefined,
  TRequestHandlerFunction extends Function,
> = <
  TFrameMiddleware extends FramesMiddleware<any, any>[] | undefined = undefined,
  TState extends JsonValue = JsonValue,
>(
  options?: FramesOptions<TState, TFrameMiddleware>
) => FramesRequestHandlerFunction<
  TState,
  TDefaultMiddleware,
  TFrameMiddleware,
  TRequestHandlerFunction
>;
