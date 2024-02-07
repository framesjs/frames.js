import * as cheerio from "cheerio";
import { FrameButton, FrameButtonsType, Frame, ErrorKeys } from "./types";
import { getByteLength, isFrameButtonLink, isValidVersion } from "./utils";
import { validateFrame } from "./validateFrame";

/**
 * @returns a { frame: Frame | null, errors: null | ErrorMessages } object, extracting the frame metadata from the given htmlString.
 * If the Frame fails validation, the `errors` object will be non-null
 */
export function getFrame({
  htmlString,
  url,
}: {
  htmlString: string;
  url: string;
}): {
  frame: Frame | null;
  errors: null | Record<ErrorKeys[number], string[]>;
} {
  // todo: this func is identical to validateFrame? what went wrong?
  return validateFrame({ htmlString, url });
}
export function parseButtonElement(elem: cheerio.Element) {
  const nameAttr = elem.attribs["name"] || elem.attribs["property"];
  const buttonIndex = nameAttr?.split(":")[3];
  try {
    return {
      buttonIndex: parseInt(buttonIndex || ""),
      content: elem.attribs["content"],
    };
  } catch (error) {
    return null;
  }
}
