import * as cheerio from "cheerio";
import {
  getByteLength,
  isFrameButtonLink,
  isFrameButtonTx,
  isFrameButtonMint,
  isValidVersion,
} from "./utils";
import { getTokenFromUrl } from "./getTokenFromUrl";
import type {
  FrameButton,
  FrameButtonsType,
  Frame,
  ImageAspectRatio,
} from "./types";

/**
 * Todo, this function should be refactored to just use zod.
 */

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
  frame: Frame;
  errors: null | Record<string, string[]>;
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
      console.error(`Error: ${key} ${message}`);
      errors[key]!.push(message);
    } else {
      errors[key] = [message];
    }
  }

  function getMetaContent(key: string) {
    const selector = `meta[property='${key}'], meta[name='${key}']`;
    const content = $(selector).attr("content");
    if (content) return content;
    return undefined;
  }

  const pageTitle = $("title").text();
  if (pageTitle === undefined) {
    // This should probably be a warning instead of an error. would help
    addError({
      message: `A <title> tag is required in order for your frames to work in Warpcast`,
      key: `<title>`,
    });
  }

  const version = getMetaContent("of:version") || getMetaContent("fc:frame");
  const image = getMetaContent("of:image") || getMetaContent("fc:frame:image");
  const imageAspectRatio =
    getMetaContent("of:image:aspect_ratio") ||
    getMetaContent("fc:frame:image:aspect_ratio");

  const state = getMetaContent("of:state") || getMetaContent("fc:frame:state");

  const accepts = $("meta")
    .filter((i, el) => {
      const name = $(el).attr("name") || $(el).attr("property");
      const content = $(el).attr("content");
      return name && content ? name.startsWith("of:accepts:") : false;
    })
    .map((i, el) => {
      const attribute = $(el).attr("name") || $(el).attr("property");
      const id = attribute?.substring("of:accepts:".length)!;
      const version = $(el).attr("content")!;
      return { id, version };
    })
    .toArray();

  const postUrl =
    getMetaContent("of:post_url") || getMetaContent("fc:frame:post_url") || url;

  const inputText =
    getMetaContent("of:input:text") || getMetaContent("fc:frame:input:text");

  const buttonLabels = [1, 2, 3, 4].flatMap((el) =>
    $(
      `meta[property='fc:frame:button:${el}'], meta[name='fc:frame:button:${el}'], meta[property='of:button:${el}'], meta[name='of:button:${el}']`
    )
      .map((i, elem) => parseButtonElement(elem))
      .filter((i, elem) => elem !== null)
      .toArray()
  );
  const buttonActions = [1, 2, 3, 4].flatMap((el) =>
    $(
      `meta[property='fc:frame:button:${el}:action'], meta[name='fc:frame:button:${el}:action'], meta[property='of:button:${el}:action'], meta[name='of:button:${el}:action']`
    )
      .map((i, elem) => parseButtonElement(elem))
      .filter((i, elem) => elem !== null)
      .toArray()
  );

  const buttonTargets = [1, 2, 3, 4].flatMap((el) =>
    $(
      `meta[property='fc:frame:button:${el}:target'], meta[name='fc:frame:button:${el}:target'], meta[property='of:button:${el}:target'], meta[name='of:button:${el}:target']`
    )
      .map((i, elem) => parseButtonElement(elem))
      .filter((i, elem) => elem !== null)
      .toArray()
  );

  const buttonPostUrls = [1, 2, 3, 4].flatMap((el) =>
    $(
      `meta[property='fc:frame:button:${el}:post_url'], meta[name='fc:frame:button:${el}:post_url'], meta[property='of:button:${el}:post_url'], meta[name='of:button:${el}:post_url']`
    )
      .map((i, elem) => parseButtonElement(elem))
      .filter((i, elem) => elem !== null)
      .toArray()
  );

  let buttonsValidation = [false, false, false, false];
  const buttonsWithActions = buttonLabels
    .map((button): FrameButton & { buttonIndex: number } => {
      const buttonAction = buttonActions.find(
        (action) => action?.buttonIndex === button?.buttonIndex
      );
      const buttonTarget = buttonTargets.find(
        (action) => action?.buttonIndex === button?.buttonIndex
      );
      const buttonPostUrl = buttonPostUrls.find(
        (action) => action?.buttonIndex === button?.buttonIndex
      );
      if (buttonsValidation[button.buttonIndex - 1]) {
        addError({
          message: "Duplicate button",
          key: `fc:frame:button:${button.buttonIndex}`,
        });
      }
      if (![1, 2, 3, 4].includes(button.buttonIndex)) {
        addError({
          message: "Incorrect button index (outside of 1,2,3,4)",
          key: `fc:frame:button:${button.buttonIndex}`,
        });
      } else {
        buttonsValidation[button.buttonIndex - 1] = true;
      }

      const action =
        buttonAction?.content !== undefined ? buttonAction?.content : "post";
      if (action === "link" || action === "tx") {
        if (!buttonTarget?.content) {
          addError({
            message:
              "No button target, but required for action type 'link' and 'tx'",
            key: `fc:frame:button:${button.buttonIndex}`,
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
            key: `fc:frame:button:${button.buttonIndex}`,
          });
        }
      }

      if (!buttonTarget?.content && ["link", "mint", "tx"].includes(action)) {
        addError({
          message: `Button target is required for action type ${action}`,
          key: `fc:frame:button:${button.buttonIndex}`,
        });
      }

      if (buttonTarget?.content && !buttonAction) {
        addError({
          message: "Missing button action (should be 'mint' or 'link' or 'tx')",
          key: `fc:frame:button:${button.buttonIndex}`,
        });
      }

      if (
        !["post_redirect", "post", "mint", "link", "tx", undefined].includes(
          buttonAction?.content
        )
      ) {
        addError({
          message: "Invalid button action specified",
          key: `fc:frame:button:${button.buttonIndex}`,
        });
      }

      if (action === "mint" && buttonTarget?.content) {
        // Validate button target conforms to CAIP-10 url spec
        try {
          getTokenFromUrl(buttonTarget.content);
        } catch (error) {
          addError({
            message: "Invalid CAIP-10 URL",
            key: `fc:frame:button:${button.buttonIndex}`,
          });
        }
      }

      return {
        buttonIndex: button.buttonIndex,
        label: button.content || "",
        post_url: buttonPostUrl?.content,
        target: buttonTarget?.content,
        // this is an optional property, falls back to "post"
        action: buttonAction?.content || "post",
      } as FrameButton & { buttonIndex: number };
    })
    .sort((a, b) => a.buttonIndex - b.buttonIndex)
    .map((button): FrameButton => {
      // type guards are weird sometimes.
      if (
        isFrameButtonLink(button) ||
        isFrameButtonMint(button) ||
        isFrameButtonTx(button)
      )
        return {
          label: button.label,
          action: button.action,
          post_url: button.post_url,
          target: button.target,
        };

      return {
        label: button.label,
        action: button.action,
        post_url: button.post_url,
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
  } else if (!(image?.startsWith("http://") || image?.startsWith("https://"))) {
    // validate image data url is not an svg
    if (
      !(
        image?.startsWith("data:image/png;base64,") ||
        image?.startsWith("data:image/jpg;base64,") ||
        image?.startsWith("data:image/jpeg;base64,") ||
        image?.startsWith("data:image/gif;base64,")
      )
    ) {
      if (image.startsWith("data:")) {
        addError({
          message:
            "Image has an unrecognized format. Only jpg, png and gif images are supported.",
          key: "fc:frame:image",
        });
      } else {
        addError({
          message:
            "Image is invalid. Images must start with `https://`, `http://` or `data:image/`",
          key: "fc:frame:image",
        });
      }
    }

    // validate data url is less than 256kb (warpcast)
    if (getByteLength(image) > 256 * 1024) {
      addError({
        message: `Data URI is more than 256kb (${Math.ceil(getByteLength(image) / 1024)}kb)`,
        key: "fc:frame:image",
      });
    }
  }

  if (state && Buffer.from(state).length > 4096) {
    addError({
      message: `State is more than 4kb (${Math.ceil(Buffer.from(state).length / 4096)}kb)`,
      key: "fc:frame:state",
    });
  }

  if (
    imageAspectRatio &&
    imageAspectRatio !== "1.91:1" &&
    imageAspectRatio !== "1:1"
  ) {
    addError({
      message: "Invalid image aspect ratio",
      key: "fc:frame:image:aspect_ratio",
    });
  }

  if (getByteLength(postUrl) > 256) {
    addError({
      message:
        "post_url is more than 256 bytes (frames.js generates a longer post_url including system params)",
      key: "fc:frame:post_url",
    });
  }
  if (buttonsWithActions.length > 4) {
    addError({ message: "Too many buttons", key: "fc:frame:button:1" });
  }
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
      imageAspectRatio: imageAspectRatio as ImageAspectRatio,
      buttons: buttonsWithActions as FrameButtonsType,
      postUrl,
      inputText,
      accepts,
      state,
    },
    errors,
  };
}

export function parseButtonElement(elem: cheerio.Element) {
  const nameAttr = elem.attribs["name"] || elem.attribs["property"];
  const buttonSegments = nameAttr?.split(":");

  // Handles both cases of fc:frame:button:N and of:button:N
  const buttonIndex =
    buttonSegments?.[0] === "fc" ? buttonSegments?.[3] : buttonSegments?.[2];
  try {
    return {
      buttonIndex: parseInt(buttonIndex || ""),
      content: elem.attribs["content"],
    };
  } catch (error) {
    return null;
  }
}
