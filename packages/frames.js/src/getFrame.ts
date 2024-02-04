import * as cheerio from "cheerio";
import { FrameButton, FrameButtonsType, Frame } from "./types";
import { getByteLength, isValidVersion } from "./utils";

/**
 * Returns a `Frame` object, extracting the frame metadata from the given htmlString, or returning null if the frame is invalid
 */
export function getFrame({
  htmlString,
  url,
}: {
  htmlString: string;
  url: string;
}): Frame | null {
  const $ = cheerio.load(htmlString);

  const version = $("meta[property='fc:frame'], meta[name='fc:frame']").attr(
    "content"
  );
  const image = $(
    "meta[property='fc:frame:image'], meta[name='fc:frame:image']"
  ).attr("content");

  const postUrl =
    $(
      "meta[property='fc:frame:post_url'], meta[name='fc:frame:post_url']"
    ).attr("content") || url;

  const inputText = $(
    "meta[property='fc:frame:input:text'], meta[name='fc:frame:input:text']"
  ).attr("content");

  const buttonLabels = $(
    "meta[property^='fc:frame:button']:not([property$=':action']), meta[name^='fc:frame:button']:not([name$=':action'])"
  )
    .map((i, elem) => parseButtonElement(elem))
    .filter((i, elem) => elem !== null)
    .toArray();

  const buttonActions = $(
    'meta[name^="fc:frame:button:"][name$=":action"], meta[property^="fc:frame:button:"][property$=":action"]'
  )
    .map((i, elem) => parseButtonElement(elem))
    .filter((i, elem) => elem !== null)
    .toArray();

  const buttonsWithActions = buttonLabels
    .map((button): FrameButton & { index: number } => {
      const action = buttonActions.find(
        (action) => action?.buttonNumber === button?.buttonNumber
      );
      return {
        index: button?.buttonNumber || 0,
        label: button?.content || "",
        action: action?.content === "post_redirect" ? "post_redirect" : "post",
      };
    })
    .sort((a, b) => a.index - b.index)
    .map(
      (button): FrameButton => ({
        label: button.label,
        action: button.action,
      })
    );

  const errors = [];
  // TODO: Useful error messages
  if (!version) {
    errors.push({ message: "No version found in frame", key: "fc:frame" });
  } else if (!isValidVersion(version))
    errors.push({
      message: "Invalid version",
      key: "fc:frame",
    });
  if (!image) {
    errors.push({ message: "No image found in frame", key: "fc:frame:image" });
  }
  if (buttonsWithActions.length > 4)
    errors.push({ message: "Too many buttons", key: "fc:frame:button" });
  if (inputText && getByteLength(inputText) > 32) {
    errors.push({
      message: "Input text should be max 32 bytes",
      key: "fc:frame:input:text",
    });
  }

  if (errors.length > 0) {
    errors.forEach((error) => {
      console.error(`Error: ${error.message}`);
    });
    return null;
  }

  return {
    version: version as "vNext" | `${number}-${number}-${number}`,
    image: image!,
    buttons: buttonsWithActions as FrameButtonsType,
    postUrl,
    inputText,
  };
}
export function parseButtonElement(elem: cheerio.Element) {
  const nameAttr = elem.attribs["name"] || elem.attribs["property"];
  const buttonNumber = nameAttr?.split(":")[3];
  try {
    return {
      buttonNumber: parseInt(buttonNumber || ""),
      content: elem.attribs["content"],
    };
  } catch (error) {
    return null;
  }
}
