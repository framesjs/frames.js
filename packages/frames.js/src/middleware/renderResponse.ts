import { ImageResponse } from "@vercel/og";
import { getFrameHtmlHead } from "../getFrameHtml";
import { getFrameFlattened } from "../getFrameFlattened";
import { type Frame } from "../types";
import type { ButtonProps } from "../core/components";
import type {
  FrameButtonElement,
  FrameDefinition,
  FramesHandlerFunctionReturnType,
  FramesMiddleware,
} from "../core/types";
import {
  generatePostButtonTargetURL,
  generateTargetURL,
  isFrameRedirect,
} from "../core/utils";
import { FRAMES_META_TAGS_HEADER } from "../core/constants";
import { FrameMessageError } from "../core/errors";

class InvalidButtonShapeError extends Error {}

class InvalidButtonCountError extends Error {}

class UnrecognizedButtonActionError extends Error {}

class ImageRenderError extends Error {}

class InvalidStateValueError extends Error {}

/**
 * This middleware is responsible for rendering the response
 *
 * If the accept header is set to application/json, it will return the metadata as JSON
 * so it is easy to parse it for metatags in existing applications.
 */
export function renderResponse(): FramesMiddleware<any, Record<string, any>> {
  return async (context, next) => {
    const wantsJSON =
      context.request.headers.get("accept") === FRAMES_META_TAGS_HEADER;
    let result: FramesHandlerFunctionReturnType<any> | Response | undefined;

    try {
      result = await next(context);
    } catch (e) {
      if (e instanceof FrameMessageError) {
        return Response.json(
          {
            message: e.message,
          },
          {
            status: e.status,
          }
        );
      }

      // eslint-disable-next-line no-console -- provide feedback to the user
      console.error(e);

      return new Response(
        wantsJSON
          ? JSON.stringify({ error: "Internal Server Error" })
          : "Internal Server Error",
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": wantsJSON ? "application/json" : "text/plain",
          },
        }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- this can happen if the handler returns undefined
    if (!result) {
      return new Response(
        wantsJSON
          ? JSON.stringify({ error: "Handler did not return a response" })
          : "Handler did not return a response",
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": wantsJSON ? "application/json" : "text/plain",
          },
        }
      );
    }

    if (result instanceof Response) {
      return result;
    }

    if (isFrameRedirect(result)) {
      return new Response(null, {
        status: result.status ?? 302,
        headers: {
          ...result.headers,
          Location: result.location.toString(),
        },
      });
    }

    try {
      let state: string | undefined;

      if (result.state) {
        if (typeof result.state !== "string") {
          throw new InvalidStateValueError("State must be a string");
        } else {
          state = result.state;
        }
      }

      // @todo validate frame so it is according to spec and throw a ValidationError in case it isn't
      // and handle that error in catch block
      const frame: Frame = {
        version: "vNext",
        state,
        // @todo rendering image could be moved to its own middleware instead so users can use something different if they want to?
        // but that would mean that we need to specify middleware manually in any app since importing it here in default middleware
        // and disabling it, has no effect on final bundle size of app
        image:
          typeof result.image === "string"
            ? generateTargetURL({
                target: result.image,
                baseUrl: context.baseUrl,
              }).toString()
            : await renderImage(result.image, result.imageOptions).catch(
                (e) => {
                  // eslint-disable-next-line no-console -- provide feedback to the user
                  console.error(e);

                  throw new ImageRenderError("Could not render image");
                }
              ),
        buttons: result.buttons
          ?.slice()
          .filter(
            (v): v is FrameButtonElement => typeof v === "object" && v !== null
          )
          .map((button, i): NonNullable<Frame["buttons"]>[number] => {
            if (!("type" in button && "props" in button)) {
              throw new InvalidButtonShapeError("Invalid button provided");
            }

            if (i > 3) {
              throw new InvalidButtonCountError("Up to 4 buttons are allowed");
            }

            const props = button.props as ButtonProps;

            switch (props.action) {
              case "link":
                return {
                  action: props.action,
                  label: props.children,
                  target: generateTargetURL({
                    target: props.target,
                    baseUrl: context.baseUrl,
                  }).toString(),
                };
              case "mint":
                return {
                  action: props.action,
                  label: props.children,
                  target: props.target,
                };
              case "tx":
                return {
                  action: props.action,
                  label: props.children,
                  target: generatePostButtonTargetURL({
                    buttonIndex: (i + 1) as 1 | 2 | 3 | 4,
                    buttonAction: "post",
                    target: props.target,
                    baseUrl: context.baseUrl,
                  }).toString(),
                  post_url: props.post_url
                    ? generatePostButtonTargetURL({
                        buttonIndex: (i + 1) as 1 | 2 | 3 | 4,
                        buttonAction: "post",
                        target: props.post_url,
                        baseUrl: context.baseUrl,
                      })
                    : undefined,
                };
              case "post":
              case "post_redirect":
                return {
                  action: props.action,
                  label: props.children,
                  target: generatePostButtonTargetURL({
                    buttonIndex: (i + 1) as 1 | 2 | 3 | 4,
                    buttonAction: props.action,
                    target: props.target,
                    baseUrl: context.baseUrl,
                  }),
                };
              default:
                throw new UnrecognizedButtonActionError(
                  "Unrecognized button action"
                );
            }
          }) as Frame["buttons"],
        inputText: result.textInput,
        imageAspectRatio: result.imageOptions?.aspectRatio ?? "1.91:1",
        accepts: result.accepts,
      };

      if (wantsJSON) {
        const flattened = getFrameFlattened(frame);

        return new Response(JSON.stringify(flattened), {
          status: result.status ?? 200,
          statusText: result.statusText ?? "OK",
          headers: {
            ...result.headers,
            "content-type": "application/json",
          },
        });
      }

      return new Response(getFrameHtmlHead(frame), {
        status: result.status ?? 200,
        statusText: result.statusText ?? "OK",
        headers: {
          ...result.headers,
          "content-type": "text/html",
        },
      });
    } catch (e) {
      let message = "Internal Server Error";

      // do not expose any unrecognized errors in response, use console.error instead
      if (
        e instanceof ImageRenderError ||
        e instanceof UnrecognizedButtonActionError ||
        e instanceof InvalidButtonCountError ||
        e instanceof InvalidButtonShapeError ||
        e instanceof InvalidStateValueError
      ) {
        message = e.message;
      } else {
        // eslint-disable-next-line no-console -- provide feedback to the user
        console.error(e);
      }

      return new Response(
        wantsJSON ? JSON.stringify({ error: message }) : message,
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": wantsJSON ? "application/json" : "text/plain",
          },
        }
      );
    }
  };
}

async function renderImage(
  element: React.ReactElement,
  options: FrameDefinition<any>["imageOptions"]
): Promise<string> {
  const response = new ImageResponse(
    // do not use React jsx here because it causes problem with tree shaking React
    {
      type: "div",
      key: "",
      props: {
        style: {
          display: "flex", // Use flex layout
          flexDirection: "row", // Align items horizontally
          alignItems: "stretch", // Stretch items to fill the container height
          width: "100%",
          height: "100vh", // Full viewport height
          backgroundColor: "white",
        },
        children: [
          {
            type: "div",
            key: "",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                lineHeight: 1.2,
                fontSize: 36,
                color: "black",
                flex: 1,
                overflow: "hidden",
              },
              children: element,
            },
          },
        ],
      },
    },
    {
      ...(options?.aspectRatio === "1:1"
        ? {
            width: 1146,
            height: 1146,
          }
        : { width: 1146, height: 600 }),
      ...options,
    }
  );

  const buffer = await response.arrayBuffer();

  return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
}
