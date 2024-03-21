import { FrameRedirect, JsonValue } from "./types";

const buttonActionToCode = {
  post: "p",
  post_redirect: "pr",
};

const BUTTON_INFORMATION_SEARCH_PARAM_NAME = "__bi";
const BUTTON_STATE_SEARCH_PARAM_NAME = "__bs";

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
  state,
}: {
  buttonIndex: 1 | 2 | 3 | 4;
  buttonAction: "post" | "post_redirect";
  currentURL: URL;
  basePath: string;
  target: string | undefined;
  /**
   * Button state
   */
  state: JsonValue | undefined;
}): string {
  let url = new URL(currentURL);

  if (target) {
    // resolve target relatively to basePath
    const baseUrl = new URL(basePath, currentURL);
    const preformatted = baseUrl.pathname + "/" + target;
    const parts = preformatted.split("/").filter(Boolean);
    const finalPathname = parts.join("/");

    url = new URL(`/${finalPathname}`, currentURL);
  }

  // store what button has been clicked in the URL
  url.searchParams.set(
    BUTTON_INFORMATION_SEARCH_PARAM_NAME,
    `${buttonIndex}:${buttonActionToCode[buttonAction]}`
  );
  if (state !== undefined) {
    url.searchParams.set(BUTTON_STATE_SEARCH_PARAM_NAME, JSON.stringify(state));
  }

  return url.toString();
}

type ButtonInformation = {
  action: "post" | "post_redirect";
  index: 1 | 2 | 3 | 4;
  state?: JsonValue;
};

export function parseButtonInformationFromTargetURL(
  url: URL
): undefined | ButtonInformation {
  const buttonInformation = url.searchParams.get(
    BUTTON_INFORMATION_SEARCH_PARAM_NAME
  );
  const buttonState = url.searchParams.get(BUTTON_STATE_SEARCH_PARAM_NAME);

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

  let state: JsonValue | undefined;

  if (buttonState) {
    try {
      state = JSON.parse(buttonState);
    } catch {
      console.warn("Failed to parse button state from URL");
    }
  }

  return {
    action,
    index,
    state,
  };
}

export function isFrameRedirect(value: any): value is FrameRedirect {
  return value && typeof value === "object" && value.kind === "redirect";
}
