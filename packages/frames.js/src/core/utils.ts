import type { UrlObject } from "node:url";
import { formatUrl } from "./formatUrl";
import type { FrameDefinition, FrameRedirect, JsonValue } from "./types";

const buttonActionToCode = {
  post: "p",
  post_redirect: "pr",
  tx: "tx",
} as const;

type ButtonActions = keyof typeof buttonActionToCode;

const BUTTON_INFORMATION_SEARCH_PARAM_NAME = "__bi";

export function joinPaths(pathA: string, pathB: string): string {
  return pathB === "/" || pathB === ""
    ? pathA
    : [pathA, pathB].join("/").replace(/\/{2,}/g, "/");
}

export function resolveBaseUrl(
  request: Request,
  baseUrl: URL | undefined,
  basePath: string
): URL {
  if (baseUrl) {
    if (basePath === "/" || basePath === "") {
      return baseUrl;
    }

    return new URL(joinPaths(baseUrl.pathname, basePath), baseUrl);
  }

  return new URL(basePath, request.url);
}

function isValidButtonIndex(index: unknown): index is 1 | 2 | 3 | 4 {
  return (
    typeof index === "number" &&
    !Number.isNaN(index) &&
    index >= 1 &&
    index <= 4
  );
}

function isValidButtonAction(action: unknown): action is ButtonActions {
  return typeof action === "string" && action in buttonActionToCode;
}

function isUrlObjectComplete(urlObject: UrlObject): boolean {
  return (
    !!urlObject.host &&
    !!urlObject.protocol &&
    !!urlObject.pathname
  );
}

export function generateTargetURL({
  baseUrl,
  target,
}: {
  baseUrl: URL;
  target: string | UrlObject | undefined;
}): URL {
  if (!target) {
    return new URL(baseUrl);
  }

  if (typeof target === "object") {
    if (isUrlObjectComplete(target)) {
      return new URL(formatUrl(target));
    }
    return new URL(
      formatUrl({
        host: baseUrl.host,
        hash: baseUrl.hash,
        hostname: baseUrl.hostname,
        href: baseUrl.href,
        // pathname: url.pathname,
        protocol: baseUrl.protocol,
        // we ignore existing search params and uses only new ones
        // search: url.search,
        port: baseUrl.port,
        // query: url.searchParams,
        ...target,
        pathname: joinPaths(baseUrl.pathname, target.pathname ?? ""),
      })
    );
  }

  try {
    // check if target is absolute url
    return new URL(target);
  } catch {
    // resolve target relatively to basePath
    const url = new URL(baseUrl);
    const finalPathname = joinPaths(url.pathname, target);

    return new URL(finalPathname, url);
  }
}

/**
 * This function generates fully qualified URL for post, post_redirect and tx buttons
 * that also encodes the button type and button value so we can use that on next frame.
 */
export function generateButtonTargetURL({
  buttonIndex,
  buttonAction,
  target,
  baseUrl,
}: {
  buttonIndex: 1 | 2 | 3 | 4;
  buttonAction: ButtonActions;
  target: string | UrlObject | undefined;
  baseUrl: URL;
}): string {
  const url = new URL(generateTargetURL({ baseUrl, target }));

  // Internal param, store what button has been clicked in the URL.
  url.searchParams.set(
    BUTTON_INFORMATION_SEARCH_PARAM_NAME,
    `${buttonIndex}-${buttonActionToCode[buttonAction]}`
  );

  return url.toString();
}

type ButtonInformation = {
  action: ButtonActions;
  index: 1 | 2 | 3 | 4;
};

export function parseSearchParams(url: URL): {
  searchParams: Record<string, string>;
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

  const [buttonIndex, buttonActionCode] = buttonInformation.split("-");

  if (!buttonIndex || !buttonActionCode) {
    return undefined;
  }

  const index = parseInt(buttonIndex, 10);
  const action = Object.entries(buttonActionToCode).find(
    ([, value]) => value === buttonActionCode
  )?.[0];

  if (!isValidButtonIndex(index) || !isValidButtonAction(action)) {
    return undefined;
  }

  return {
    action,
    index,
  };
}

export function isFrameRedirect(value: unknown): value is FrameRedirect {
  return (
    value !== null &&
    typeof value === "object" &&
    "kind" in value &&
    value.kind === "redirect"
  );
}

export function isFrameDefinition(
  value: unknown
): value is FrameDefinition<undefined | JsonValue> {
  return value !== null && typeof value === "object" && "image" in value;
}
