import type { CheerioAPI } from "cheerio";
import type { FrameButton, ImageAspectRatio } from "../types";
import { getByteLength } from "../utils";
import { getTokenFromUrl } from "../getTokenFromUrl";
import type { ParseError, ParseErrorSource, ParsedButton } from "./types";

export function addError(
  errors: Record<string, ParseError[]>,
  key: string,
  error: unknown,
  source: ParseErrorSource
): void {
  const errorsList = errors[key] || [];

  let messageString: string;

  if (typeof error === "string") {
    messageString = error;
  } else if (error instanceof Error) {
    messageString = error.message;
  } else if (
    typeof error === "object" &&
    error &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    messageString = error.message;
  } else {
    messageString = String(error);
  }

  errorsList.push({ message: messageString, source });
  errors[key] = errorsList;
}

export function validate<TValidator extends (...args: any) => any>(
  errors: Record<string, ParseError[]>,
  errorKey: string,
  source: ParseErrorSource,
  validator: TValidator,
  ...validatorArgs: Parameters<TValidator>
): ReturnType<TValidator> | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- this is correct
    return validator(...validatorArgs);
  } catch (e) {
    addError(errors, errorKey, e, source);

    return undefined;
  }
}

export function isValid<TValidator extends (...args: any) => any>(
  errors: Record<string, ParseError[]>,
  errorKey: string,
  source: ParseErrorSource,
  validator: TValidator,
  ...validatorArgs: Parameters<TValidator>
): boolean {
  try {
    validator(...validatorArgs);
    return true;
  } catch (e) {
    addError(errors, errorKey, e, source);

    return false;
  }
}

export function validateFrameImage(image: string): string | never {
  const url = new URL(image);

  if (url.protocol === "data:") {
    const mimeTypeAndBase64 = url.pathname.substring(0, 18).toLowerCase();

    if (
      ![
        "image/png;base64,",
        "image/jpg;base64,",
        "image/jpeg;base64,",
        "image/gif;base64,",
      ].some((mimeTypePrefix) => mimeTypeAndBase64.startsWith(mimeTypePrefix))
    ) {
      throw new Error(
        'Invalid image URL. Only "image/png", "image/jpg", "image/jpeg" and "image/gif" MIME types are allowed'
      );
    }

    if (getByteLength(url.href) > 256 * 1024) {
      throw new Error("Invalid image URL. Image size exceeds 256KB limit");
    }
  } else if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      'Invalid image URL. Only "http", "https" and "data" protocols are allowed'
    );
  }

  return url.href;
}

export function validateInputText(inputText: string): string | never {
  if (getByteLength(inputText) > 32) {
    throw new Error("Invalid input text. Text size exceeds 32 bytes limit");
  }

  return inputText;
}

export function validateAspectRatio(ratio: string): ImageAspectRatio | never {
  if (!["1:1", "1.91:1"].includes(ratio)) {
    throw new Error("Invalid image aspect ratio");
  }

  return ratio as ImageAspectRatio;
}

export function validateUrl(
  url: string,
  maxLength: number | false
): string | never {
  const urlObject = new URL(url);

  if (maxLength !== false && getByteLength(url) > maxLength) {
    throw new Error(
      `Invalid URL. URL size exceeds ${maxLength} bytes limit (frames.js generates a longer post_url including system params).`
    );
  }

  return urlObject.href;
}

export function validateState(state: string): string | never {
  if (getByteLength(state) > 4096) {
    throw new Error("Invalid state. State size exceeds 4096 bytes limit");
  }

  return state;
}

export type ParsedButtonWithBasicInfo = Exclude<ParsedButton, "label"> &
  Required<Pick<ParsedButton, "label">>;

type ButtonMetaPropertyPrefix = "fc:frame:button" | "of:button";

export function parseButtons(
  $: CheerioAPI,
  errors: Record<string, ParseError[]>,
  source: ParseErrorSource,
  metaPropertyPrefix: ButtonMetaPropertyPrefix
): FrameButton[] {
  const foundMetaTags = $(
    `meta[property^="${metaPropertyPrefix}"], meta[name^="${metaPropertyPrefix}"]`
  );
  const buttonsData: Record<string, ParsedButton> = {};
  const visitedProperties = new Set<string>();
  const buttonMetaTagRegex = new RegExp(
    `^${metaPropertyPrefix}:([1-4])(?::(action|target|post_url))?$`
  );

  for (const metaTag of foundMetaTags) {
    const attributeName =
      metaTag.attribs.property || metaTag.attribs.name || "";

    const buttonInformation = buttonMetaTagRegex.exec(attributeName);

    if (!buttonInformation) {
      addError(errors, attributeName, "Unrecognized meta tag", source);
      continue;
    }

    if (visitedProperties.has(attributeName)) {
      addError(errors, attributeName, "Duplicate meta tag", source);
      continue;
    } else {
      visitedProperties.add(attributeName);
    }

    const [, buttonNumber, property] = buttonInformation;

    if (!buttonNumber) {
      addError(errors, attributeName, "Invalid button number", source);
      continue;
    }

    const buttonNumberInt = parseInt(buttonNumber, 10);
    let buttonData = buttonsData[buttonNumberInt];

    if (!buttonData) {
      buttonData = { index: buttonNumberInt };
      buttonsData[buttonNumberInt] = buttonData;
    }

    if (!property) {
      buttonData.label = metaTag.attribs.content;
    } else {
      buttonData[
        property as unknown as Exclude<keyof ParsedButton, "index" | "label">
      ] = metaTag.attribs.content;
    }
  }

  const buttons: (FrameButton | undefined)[] = [
    undefined,
    undefined,
    undefined,
    undefined,
  ];
  let minAssignedIndex = Infinity;
  let maxAssignedIndex = -Infinity;

  function assignMinAndMaxIndex(index: number): void {
    minAssignedIndex = Math.min(minAssignedIndex, index);
    maxAssignedIndex = Math.max(maxAssignedIndex, index);
  }

  // sort buttons by index and check if there are any gaps
  for (const button of Object.values(buttonsData)) {
    if (!validateBasicButtonInfo(errors, source, metaPropertyPrefix, button)) {
      continue;
    }

    const index = button.index - 1;

    // now validate data based on button action
    switch (button.action) {
      case "link": {
        buttons[index] = parseLinkButton(
          errors,
          source,
          metaPropertyPrefix,
          button
        );
        assignMinAndMaxIndex(index);
        break;
      }
      case "mint": {
        buttons[index] = parseMintButton(
          errors,
          source,
          metaPropertyPrefix,
          button
        );
        assignMinAndMaxIndex(index);
        break;
      }
      case "tx": {
        buttons[index] = parseTxButton(
          errors,
          source,
          metaPropertyPrefix,
          button
        );
        assignMinAndMaxIndex(index);
        break;
      }
      case "post":
      case "post_redirect":
      default: {
        buttons[index] = parsePostOrPostRedirectButton(
          errors,
          source,
          metaPropertyPrefix,
          {
            ...button,
            // if action is missing, it defaults to "post"
            action:
              "action" in button && button.action ? button.action : "post",
          }
        );
        assignMinAndMaxIndex(index);
      }
    }
  }

  // check if there are any gaps amongst buttons, we know that buttons are always assigned by index
  // so we just have to make sure, that there are no empty slots before each button
  let previousButtonIndex = -1;

  for (const [index, button] of buttons.entries()) {
    if (button) {
      if (index - previousButtonIndex !== 1) {
        addError(
          errors,
          `${metaPropertyPrefix}:${index + 1}`,
          "Button sequence is not continuous",
          source
        );
      }

      previousButtonIndex = index;
    }
  }

  return buttons.filter((button): button is FrameButton => Boolean(button));
}

function validateBasicButtonInfo(
  errors: Record<string, ParseError[]>,
  source: ParseErrorSource,
  metaPropertyPrefix: ButtonMetaPropertyPrefix,
  button: ParsedButton
): button is ParsedButtonWithBasicInfo {
  if (!button.label) {
    addError(
      errors,
      `${metaPropertyPrefix}:${button.index}`,
      "Missing button label",
      source
    );
    return false;
  }

  return true;
}

function parsePostOrPostRedirectButton(
  errors: Record<string, ParseError[]>,
  source: ParseErrorSource,
  metaPropertyPrefix: ButtonMetaPropertyPrefix,
  button: ParsedButtonWithBasicInfo
): FrameButton | undefined {
  if (!button.action || !["post", "post_redirect"].includes(button.action)) {
    addError(
      errors,
      `${metaPropertyPrefix}:${button.index}:action`,
      "Invalid button action",
      source
    );

    return undefined;
  }

  if (
    button.target &&
    !isValid(
      errors,
      `${metaPropertyPrefix}:${button.index}:target`,
      source,
      validateUrl,
      button.target,
      false
    )
  ) {
    return undefined;
  }

  return {
    action: button.action as "post" | "post_redirect",
    label: button.label,
    target: button.target,
  };
}

function parseLinkButton(
  errors: Record<string, ParseError[]>,
  source: ParseErrorSource,
  metaPropertyPrefix: ButtonMetaPropertyPrefix,
  button: ParsedButtonWithBasicInfo
): FrameButton | undefined {
  if (button.action !== "link") {
    addError(
      errors,
      `${metaPropertyPrefix}:${button.index}:action`,
      "Invalid button action",
      source
    );

    return undefined;
  }

  if (!button.target) {
    addError(
      errors,
      `${metaPropertyPrefix}:${button.index}:target`,
      "Missing button target url",
      source
    );

    return undefined;
  }

  if (
    !isValid(
      errors,
      `${metaPropertyPrefix}:${button.index}:target`,
      source,
      validateUrl,
      button.target,
      false
    )
  ) {
    return undefined;
  }

  return {
    action: button.action as "link",
    label: button.label,
    target: button.target,
  };
}

function parseMintButton(
  errors: Record<string, ParseError[]>,
  source: ParseErrorSource,
  metaPropertyPrefix: ButtonMetaPropertyPrefix,
  button: ParsedButtonWithBasicInfo
): FrameButton | undefined {
  if (button.action !== "mint") {
    addError(
      errors,
      `${metaPropertyPrefix}:${button.index}:action`,
      "Invalid button action",
      source
    );

    return undefined;
  }

  if (!button.target) {
    addError(
      errors,
      `${metaPropertyPrefix}:${button.index}:target`,
      "Missing button target url",
      source
    );

    return undefined;
  }

  try {
    getTokenFromUrl(button.target);
  } catch {
    addError(
      errors,
      `${metaPropertyPrefix}:${button.index}:target`,
      "Invalid CAIP-10 URL",
      source
    );

    return undefined;
  }

  return {
    action: "mint",
    label: button.label,
    target: button.target,
  };
}

function parseTxButton(
  errors: Record<string, ParseError[]>,
  source: ParseErrorSource,
  metaPropertyPrefix: ButtonMetaPropertyPrefix,
  button: ParsedButtonWithBasicInfo
): FrameButton | undefined {
  if (button.action !== "tx") {
    addError(
      errors,
      `${metaPropertyPrefix}:${button.index}:action`,
      "Invalid button action",
      source
    );

    return undefined;
  }

  if (!button.target) {
    addError(
      errors,
      `${metaPropertyPrefix}:${button.index}:target`,
      "Missing button target url",
      source
    );

    return undefined;
  } else if (
    !isValid(
      errors,
      `${metaPropertyPrefix}:${button.index}:target`,
      source,
      validateUrl,
      button.target,
      false
    )
  ) {
    return undefined;
  }

  if (button.post_url) {
    if (
      !isValid(
        errors,
        `${metaPropertyPrefix}:${button.index}:post_url`,
        source,
        validateUrl,
        button.post_url,
        false
      )
    ) {
      return undefined;
    }
  }

  return {
    action: "tx",
    label: button.label,
    target: button.target,
    post_url: button.post_url,
  };
}

export function getMetaTag(
  $: CheerioAPI,
  property: string,
  defaultValue?: string
): string | undefined {
  const value = $(
    `meta[property="${property}"], meta[name="${property}"]`
  ).attr("content");

  if (typeof defaultValue !== "string") {
    return value;
  }

  return value ?? defaultValue;
}

export function mergeErrors(
  a: Record<string, ParseError[]> | undefined,
  b: Record<string, ParseError[]> | undefined
): Record<string, ParseError[]> | undefined {
  if (a && !b) {
    return a;
  }

  if (!a && b) {
    return b;
  }

  if (!a && !b) {
    return undefined;
  }

  if (a === undefined && b === undefined) {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- can't be undefined
  const allKeys = new Set([...Object.keys(a!), ...Object.keys(b!)]);
  const mergedErrors: Record<string, ParseError[]> = {};

  for (const key of allKeys) {
    const errorsA = a?.[key]?.slice() || [];
    const errorsB = b?.[key]?.slice() || [];

    mergedErrors[key] = [...errorsA, ...errorsB];
  }

  return mergedErrors;
}
