import * as cheerio from "cheerio";
import { FrameButton, FrameButtonsType, Frame, ErrorKeys } from "./types";
import { getByteLength, isFrameButtonLink, isValidVersion } from "./utils";

/**
 * @returns a { frame: Frame | null, errors: null | ErrorMessages } object, extracting the frame metadata from the given htmlString.
 * If the Frame fails validation, the `errors` object will be non-null
 */
export function validateFrame({
  htmlString,
  url,
}: {
  htmlString: string;
  url: string;
}): {
  frame: Frame | null;
  errors: null | Record<ErrorKeys[number], string[]>;
} {
  const $ = cheerio.load(htmlString);
  let errors: null | Record<string, string[]> = null;

  function addError({ key, message }: { key: string; message: string }) {
    if (!errors) errors = {};
    if (
      errors.hasOwnProperty(key) &&
      errors[key] &&
      Array.isArray(errors[key])
    ) {
      console.log(`Error: ${key} ${message}`);
      errors[key]!.push(message);
    } else {
      errors[key] = [message];
    }
  }

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

  const buttonLabels = [1, 2, 3, 4].flatMap((el) =>
    $(
      `meta[property^='fc:frame:button:${el}'], meta[name='fc:frame:button:${el}']`
    )
      .map((i, elem) => parseButtonElement(elem))
      .filter((i, elem) => elem !== null)
      .toArray()
  );
  const buttonActions = [1, 2, 3, 4].flatMap((el) =>
    $(
      `meta[property^='fc:frame:button:${el}:action'], meta[name='fc:frame:button:${el}:action']`
    )
      .map((i, elem) => parseButtonElement(elem))
      .filter((i, elem) => elem !== null)
      .toArray()
  );

  const buttonTargets = [1, 2, 3, 4].flatMap((el) =>
    $(
      `meta[property^='fc:frame:button:${el}:target'], meta[name='fc:frame:button:${el}:target']`
    )
      .map((i, elem) => parseButtonElement(elem))
      .filter((i, elem) => elem !== null)
      .toArray()
  );

  let buttonsValidation = [false, false, false, false];
  const buttonsWithActions = buttonLabels
    .map((buttonLabel): FrameButton & { buttonIndex: number } => {
      const buttonAction = buttonActions.find(
        (action) => action?.buttonIndex === buttonLabel?.buttonIndex
      );
      const buttonTarget = buttonTargets.find(
        (action) => action?.buttonIndex === buttonLabel?.buttonIndex
      );
      if (buttonsValidation[buttonLabel.buttonIndex - 1]) {
        addError({
          message: "Duplicate button",
          key: `fc:frame:button:${buttonLabel.buttonIndex}`,
        });
      }
      if (![1, 2, 3, 4].includes(buttonLabel.buttonIndex)) {
        addError({
          message: "Incorrect button index (outside of 1,2,3,4)",
          key: `fc:frame:button:${buttonLabel.buttonIndex}`,
        });
      } else {
        buttonsValidation[buttonLabel.buttonIndex - 1] = true;
      }

      const action =
        buttonAction?.content !== undefined ? buttonAction?.content : "post";
      if (action === "link") {
        if (!buttonTarget?.content) {
          addError({
            message: "No button target, but required for action type link",
            key: `fc:frame:button:${buttonLabel.buttonIndex}`,
          });
        }
        if (
          !(
            buttonTarget?.content?.startsWith("http://") ||
            buttonTarget?.content?.startsWith("https://")
          )
        ) {
          addError({
            message:
              "External links MUST use the https://  or http:// protocols. ",
            key: `fc:frame:button:${buttonLabel.buttonIndex}`,
          });
        }
      }
      return {
        buttonIndex: buttonLabel.buttonIndex,
        label: buttonLabel.content || "",
        target: buttonTarget?.content,
        // this is an optional property, falls back to "post"
        action: buttonAction?.content || "post",
      } as FrameButton & { buttonIndex: number };
    })
    .sort((a, b) => a.buttonIndex - b.buttonIndex)
    .map((button): FrameButton => {
      // type guards are weird sometimes.
      if (isFrameButtonLink(button))
        return {
          label: button.label,
          action: button.action,
          target: button.target,
        };
      return {
        label: button.label,
        action: button.action,
        target: button.target,
      };
    });

  // buttons order validation without a gap like 1, 3, 4
  if (
    buttonsValidation.some((x, i) => !x && i < 3 && buttonsValidation[i + 1])
  ) {
    addError({
      message: `Gap in buttons sequence, ${buttonsValidation.map((el, i) => `${el ? i + 1 : ""}`).join(",")}`,
      key: `fc:frame:button:1`,
    });
  }

  if (!version) {
    addError({ message: "No version found in frame", key: "fc:frame" });
  } else if (!isValidVersion(version))
    addError({
      message: "Invalid version",
      key: "fc:frame",
    });
  if (!image) {
    addError({ message: "No image found in frame", key: "fc:frame:image" });
  }
  if (!postUrl) {
    addError({
      message: "No post_url in frame",
      key: "fc:frame:post_url",
    });
  }
  if (getByteLength(postUrl) > 256) {
    addError({
      message:
        "post_url is more than 256 bytes (frames.js generates a longer post_url including system params)",
      key: "fc:frame:post_url",
    });
  }
  if (buttonsWithActions.length > 4)
    addError({ message: "Too many buttons", key: "fc:frame:button" });
  if (inputText && getByteLength(inputText) > 32) {
    addError({
      message: "Input text should be max 32 bytes",
      key: "fc:frame:input:text",
    });
  }

  // Future:
  // todo: might need to consider validating that there aren't too many of something, like images
  // todo: validate image dimensions, filetype, size  const image = await fetch(image){}
  // todo: validate post_url is a valid url

  return {
    frame: {
      version: version as "vNext" | `${number}-${number}-${number}`,
      image: image!,
      buttons: buttonsWithActions as FrameButtonsType,
      postUrl,
      inputText,
    },
    errors,
  };
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
