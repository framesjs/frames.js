import { ImageResponse } from "@vercel/og";
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
export type FramesContext = {
  /**
   * All frame relative targets will be resolved relative to this
   */
  basePath: string;
  initialState?: JsonValue;
  request: Request;
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
export type FrameDefinition = {
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
  state?: JsonValue;
} & ResponseInit;

/**
 * Frame redirect, this should happen only in response to post_redirect button
 */
export type FrameRedirect = {
  kind: "redirect";
  location: string | URL;
} & ResponseInit;

export type FramesHandlerFunctionReturnType = FrameDefinition | FrameRedirect;

type FramesMiddlewareNextFunction<
  TReturnedContext extends AllowedFramesContextShape,
> = (context?: TReturnedContext) => FramesMiddlewareReturnType;

export type FramesMiddlewareReturnType = Promise<
  FramesHandlerFunctionReturnType | Response
>;

export type FramesMiddleware<
  TReturnedContext extends AllowedFramesContextShape,
> = (
  context: FramesContext,
  next: FramesMiddlewareNextFunction<TReturnedContext>
) => FramesMiddlewareReturnType;

export type FrameHandlerFunction<
  TFramesContext extends AllowedFramesContextShape,
> = (
  ctx: FramesContext & TFramesContext
) => Promise<FramesHandlerFunctionReturnType>;

export type FramesContextFromMiddlewares<
  TMiddlewares extends
    | FramesMiddleware<any>[]
    | ReadonlyArray<FramesMiddleware<any>>,
> = UnionToIntersection<
  {
    [K in keyof TMiddlewares]: TMiddlewares[K] extends FramesMiddleware<
      infer Ctx
    >
      ? Ctx
      : never;
  }[number]
>;
