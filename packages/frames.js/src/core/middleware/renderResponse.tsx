import React from "react";
import { ImageResponse } from "@vercel/og";
import { type Frame, getFrameFlattened, getFrameHtmlHead } from "../..";
import type { ButtonProps } from "../components";
import type {
  FrameDefinition,
  FramesHandlerFunctionReturnType,
  FramesMiddleware,
} from "../types";
import { generatePostButtonTargetURL, isFrameRedirect } from "../utils";
import { FRAMES_META_TAGS_HEADER } from "..";

class InvalidButtonShapeError extends Error {}

class InvalidButtonCountError extends Error {}

class UnrecognizedButtonActionError extends Error {}

class ImageRenderError extends Error {}

/**
 * This middleware is responsible for rendering the response
 *
 * If the accept header is set to application/json, it will return the metadata as JSON
 * so it is easy to parse it for metatags in existing applications.
 */
export function renderResponse(): FramesMiddleware<any, {}> {
  return async (context, next) => {
    const wantsJSON =
      context.request.headers.get("accept") === FRAMES_META_TAGS_HEADER;
    let result: FramesHandlerFunctionReturnType<any> | Response;

    try {
      result = await next(context);
    } catch (e) {
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

    let state: string | undefined;

    // state is supported only in reactions to button clicks (POST requests)
    if (result.state) {
      if (context.request.method === "POST") {
        state = JSON.stringify(result.state);
      } else {
        console.warn(
          "State is not supported on initial request (the one initialized when Frames are rendered for first time, that uses GET request) and will be ignored"
        );
      }
    }

    try {
      // @todo validate frame so it is according to spec and throw a ValidationError in case it isn't
      // and handle that error in catch block
      const frame: Frame = {
        version: "vNext",
        postUrl: "",
        state,
        // @todo rendering image could be moved to its own middleware instead so users can use something different if they want to?
        // but that would mean that we need to specify middleware manually in any app since importing it here in default middleware
        // and disabling it, has no effect on final bundle size of app
        image:
          typeof result.image === "string"
            ? result.image
            : await renderImage(result.image, result.imageOptions).catch(
                (e) => {
                  console.error(e);

                  throw new ImageRenderError("Could not render image");
                }
              ),
        buttons: result.buttons?.map(
          (button, i): NonNullable<Frame["buttons"]>[number] => {
            if (!("type" in button && "props" in button)) {
              throw new InvalidButtonShapeError("Invalid button provided");
            }

            if (i > 3) {
              throw new InvalidButtonCountError("Only 4 buttons are allowed");
            }

            const props = button.props as ButtonProps;

            switch (props.action) {
              case "link":
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
                    currentURL: context.currentURL,
                    basePath: context.basePath,
                    state: props.state,
                  }),
                  post_url: props.post_url
                    ? generatePostButtonTargetURL({
                        buttonIndex: (i + 1) as 1 | 2 | 3 | 4,
                        buttonAction: "post",
                        target: props.post_url,
                        currentURL: context.currentURL,
                        basePath: context.basePath,
                        state: props.state,
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
                    currentURL: context.currentURL,
                    basePath: context.basePath,
                    state: props.state,
                  }),
                };
              default:
                throw new UnrecognizedButtonActionError(
                  "Unrecognized button action"
                );
            }
          }
        ) as Frame["buttons"],
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
      let message: string = "Internal Server Error";

      // do not expose any unrecognized errors in response, use console.error instead
      if (
        e instanceof ImageRenderError ||
        e instanceof UnrecognizedButtonActionError ||
        e instanceof InvalidButtonCountError ||
        e instanceof InvalidButtonShapeError
      ) {
        message = e.message;
      } else {
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
    (
      <div
        style={{
          display: "flex", // Use flex layout
          flexDirection: "row", // Align items horizontally
          alignItems: "stretch", // Stretch items to fill the container height
          width: "100%",
          height: "100vh", // Full viewport height
          backgroundColor: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            lineHeight: 1.2,
            fontSize: 36,
            color: "black",
            flex: 1,
            overflow: "hidden",
          }}
        >
          {element}
        </div>
      </div>
    ),
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
