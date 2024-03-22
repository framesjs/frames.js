import { formatUrl } from "./formatUrl";
import { FrameDefinition, FrameRedirect } from "./types";
import type { UrlObject } from "url";

const buttonActionToCode = {
  post: "p",
  post_redirect: "pr",
};

const BUTTON_INFORMATION_SEARCH_PARAM_NAME = "__bi";

function isValidButtonIndex(index: any): index is 1 | 2 | 3 | 4 {
  return (
    typeof index === "number" &&
    !Number.isNaN(index) &&
    index >= 1 &&
    index <= 4
  );
}

function isValidButtonAction(action: any): action is "post" | "post_redirect" {
  return (
    typeof action === "string" &&
    (action === "post" || action === "post_redirect")
  );
}

export function generateTargetURL({
  currentURL,
  target,
  basePath,
}: {
  currentURL: URL;
  basePath: string;
  target: string | UrlObject | undefined;
}): string {
  let url = new URL(currentURL);

  if (
    target &&
    typeof target == "string" &&
    (target.startsWith("http://") || target.startsWith("https://"))
  ) {
    // handle absolute urls
    url = new URL(target);
  } else if (target && typeof target === "string") {
    // resolve target relatively to basePath
    const baseUrl = new URL(basePath, currentURL);
    const preformatted = baseUrl.pathname + "/" + target;
    const parts = preformatted.split("/").filter(Boolean);
    const finalPathname = parts.join("/");

    url = new URL(`/${finalPathname}`, currentURL);
  } else if (target && typeof target === "object") {
    // resolve target relatively to basePath

    url = new URL(
      formatUrl({
        host: url.host,
        hash: url.hash,
        hostname: url.hostname,
        href: url.href,
        // pathname: url.pathname,
        protocol: url.protocol,
        // we ignore existing search params and uses only new ones
        // search: url.search,
        port: url.port,
        // query: url.searchParams,
        ...target,
        pathname:
          "/" +
          [basePath ?? "", "/", target.pathname ?? ""]
            .join("")
            .split("/")
            .filter(Boolean)
            .join("/"),
      })
    );
  }

  return url.toString();
}

/**
 * This function generates fully qualified URL for post and post_redirect buttons
 * that also encodes the button type and button value so we can use that on next frame.
 */
export function generatePostButtonTargetURL({
  buttonIndex,
  buttonAction,
  currentURL,
  target,
  basePath,
}: {
  buttonIndex: 1 | 2 | 3 | 4;
  buttonAction: "post" | "post_redirect";
  currentURL: URL;
  basePath: string;
  target: string | UrlObject | undefined;
}): string {
  const url = new URL(generateTargetURL({ currentURL, basePath, target }));

  // Internal param, store what button has been clicked in the URL.
  url.searchParams.set(
    BUTTON_INFORMATION_SEARCH_PARAM_NAME,
    `${buttonIndex}:${buttonActionToCode[buttonAction]}`
  );

  return url.toString();
}

type ButtonInformation = {
  action: "post" | "post_redirect";
  index: 1 | 2 | 3 | 4;
};

export function parseSearchParams(url: URL): {
  searchParams: {
    [k: string]: string;
  };
} {
  const searchParams = Object.fromEntries(url.searchParams);

  return {
    searchParams,
  };
}

export function parseButtonInformationFromTargetURL(
  url: URL
): undefined | ButtonInformation {
  const buttonInformation = url.searchParams.get(
    BUTTON_INFORMATION_SEARCH_PARAM_NAME
  );

  // parse state only if button has been identified
  if (!buttonInformation) {
    return undefined;
  }

  const [buttonIndex, buttonActionCode] = buttonInformation.split(":");

  if (!buttonIndex || !buttonActionCode) {
    return undefined;
  }

  const index = parseInt(buttonIndex, 10);
  const action = Object.entries(buttonActionToCode).find(
    ([, value]) => value === buttonActionCode
  )?.[0] as "post" | "post_redirect";

  if (!isValidButtonIndex(index) || !isValidButtonAction(action)) {
    return undefined;
  }

  return {
    action,
    index,
  };
}

export function isFrameRedirect(value: any): value is FrameRedirect {
  return value && typeof value === "object" && value.kind === "redirect";
}

export function isFrameDefinition(value: any): value is FrameDefinition<any> {
  return value && typeof value === "object" && "image" in value;
}
