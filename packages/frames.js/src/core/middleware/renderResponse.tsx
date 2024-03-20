import { ImageResponse } from "@vercel/og";
import { type Frame, getFrameFlattened, getFrameHtmlHead } from "../..";
import type { ButtonProps } from "../components";
import type { FrameDefinition, FramesMiddleware } from "../types";
import { generatePostButtonTargetURL, isFrameRedirect } from "../utils";

/**
 * This middleware is responsible for rendering the response
 *
 * If the accept header is set to application/json, it will return the metadata as JSON
 * so it is easy to parse it for metatags in existing applications.
 */
export function renderResponse(): FramesMiddleware<{}> {
  return async (context, next) => {
    const wantsJSON =
      context.request.headers.get("accept") === "application/json";

    const result = await next(context);

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

    const frame: Frame = {
      version: "vNext",
      postUrl: "",
      state: result.state ? JSON.stringify(result.state) : undefined,
      // @todo rendering image could be moved to its own middleware instead so users can use something different if they want to?
      // but that would mean that we need to specify middleware manually in any app since importing it here in default middleware
      // and disabling it, has no effect on final bundle size of app
      image:
        typeof result.image === "string"
          ? result.image
          : await renderImage(result.image, result.imageOptions),
      buttons: result.buttons?.map(
        (button, i): NonNullable<Frame["buttons"]>[number] => {
          if (!("type" in button && "props" in button)) {
            throw new Error("Invalid button provided");
          }

          if (i > 3) {
            throw new Error("Only 4 buttons are allowed");
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
              throw new Error("Unrecognized button action");
          }
        }
      ) as Frame["buttons"],
      inputText: result.textInput,
      imageAspectRatio: result.imageOptions?.aspectRatio ?? "1.91:1",
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
  };
}

async function renderImage(
  element: React.ReactElement,
  options: FrameDefinition["imageOptions"]
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
