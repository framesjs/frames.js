import {
  CastId,
  FrameActionData,
  FrameActionMessage,
  HubRpcClient,
  Message,
  MessageType,
  getSSLHubRpcClient,
} from "@farcaster/hub-nodejs";
import * as cheerio from "cheerio";

type Button = {
  label: string;
  /** Must be post or  post_redirect. Defaults to post if no value was specified.
   * If set to post, app must make the POST request and frame server must respond with a 200 OK, which may contain another frame.
   * If set to post_redirect, app must make the POST request, and the frame server must respond with a 302 OK with a location property set on the header. */
  action?: "post" | "post_redirect";
};

export type FrameMetadata = {
  /** A valid frame version string. The string must be a release date (e.g. 2020-01-01 ) or vNext. Apps must ignore versions they do not understand. Currently, the only valid version is vNext.  */
  version: string;
  /** A page may contain 0 to 4 buttons. If more than 1 button is present, the idx values must be in sequence starting from 1 (e.g. 1, 2 3). If a broken sequence is present (e.g 1, 2, 4), apps must not render the frame and instead render an OG embed. */
  buttons?: Button[];
  /** An image which must be smaller than 10MB and should have an aspect ratio of 1.91:1 */
  image: string;
  /** An image which must be smaller than 10MB and should have an aspect ratio of 1.91:1. Fallback for clients that do not support frames. */
  ogImage?: string;
  /** A 256-byte string which contains a valid URL to send the Signature Packet to. If this prop is not present, apps must POST to the frame URL.  */
  postUrl?: string;
  /** A period in seconds at which the app should expect the image to update. Must be at least 30. Apps should default to 86,400 (1 day) if not set or invalid. */
  refreshPeriod?: number;
};

function parseButtonElement(elem: cheerio.Element) {
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

export function parseFrame({
  text,
  url,
}: {
  text: string;
  url?: string;
}): FrameMetadata | null {
  const $ = cheerio.load(text);

  const version = $("meta[property='fc:frame'], meta[name='fc:frame']").attr(
    "content"
  );
  const image = $(
    "meta[property='fc:frame:image'], meta[name='fc:frame:image']"
  ).attr("content");

  // TODO: Useful error messages
  if (!version || !image) {
    return null;
  }

  const postUrl =
    $(
      "meta[property='fc:frame:post_url'], meta[name='fc:frame:post_url']"
    ).attr("content") || url;

  const buttonLabels = $(
    "meta[property^='fc:frame:button']:not([property$=':action']), meta[name^='fc:frame:button']:not([name$=':action'])"
  )
    .map((i, elem) => parseButtonElement(elem))
    .filter((i, elem) => elem !== null)
    .toArray();

  let refreshPeriod = undefined;

  try {
    const refreshPeriodContent = $(
      `meta[property='fc:frame:refresh_period'], meta[name='fc:frame:refresh_period']`
    ).attr("content");
    refreshPeriod = refreshPeriodContent
      ? parseInt(refreshPeriodContent)
      : undefined;
    console.log("refreshPeriod", refreshPeriod);
  } catch (error) {
    console.error(error);
  }

  const buttonActions = $(
    'meta[name^="fc:frame:button:"][name$=":action"], meta[property^="fc:frame:button:"][property$=":action"]'
  )
    .map((i, elem) => parseButtonElement(elem))
    .filter((i, elem) => elem !== null)
    .toArray();

  const buttonsWithActions = buttonLabels
    .map((button): Button & { index: number } => {
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
      (button): Button => ({
        label: button.label,
        action: button.action,
      })
    )
    // First 4
    .slice(0, 4);

  return {
    version: version,
    image: image,
    buttons: buttonsWithActions,
    postUrl,
    refreshPeriod,
  };
}

export function getHubClient(): HubRpcClient {
  return getSSLHubRpcClient(
    process.env.FRAME_HUB_URL ||
      process.env.HUB_URL ||
      "nemes.farcaster.xyz:2283"
  );
}

export async function getFrameMessage(
  body: any,
  options?: { ignoreSignature?: boolean }
): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  options = options || {};

  const frameMessage: Message = Message.decode(
    Buffer.from(body?.trustedData?.messageBytes ?? "", "hex")
  );

  const client = getHubClient();
  const result = await client.validateMessage(frameMessage);
  if (
    result.isOk() &&
    result.value.valid &&
    result.value.message &&
    result.value.message.data?.type === MessageType.FRAME_ACTION
  ) {
    return {
      isValid: result.value.valid,
      message: result.value.message as FrameActionMessage,
    };
  }
  return {
    isValid: false,
    message: undefined,
  };
}

export function getFrameActionData(
  message: FrameActionMessage
): FrameActionData | undefined {
  return message?.data as FrameActionData;
}

export function normalizeCastId(castId: CastId): {
  fid: number;
  hash: `0x${string}`;
} {
  return {
    fid: castId.fid,
    hash: ("0x" + Buffer.from(castId.hash).toString("hex")) as `0x${string}`,
  };
}

export function frameMetadataToHtml(frame: FrameMetadata) {
  return `<meta property="og:image" content="${frame.ogImage || frame.image}">
  <meta name="fc:frame" content="vNext">
  <meta name="fc:frame:image" content="${frame.image}">
  <meta name="fc:frame:post_url" content="${frame.postUrl}">
  ${
    frame.buttons
      ?.map(
        (button, index) =>
          `<meta name="fc:frame:button:${index + 1}" content="${button.label}">
        <meta name="fc:frame:button:${index + 1}:action" content="${button.action}">`
      )
      .join("\n") || ""
  }
  ${frame.refreshPeriod ? `<meta name="fc:frame:refresh_period" content="${frame.refreshPeriod}">` : ""}
  `;
}

export function frameMetadataToHtmlResponse(
  frame: FrameMetadata,
  options: {
    og?: { title: string };
    title?: string;
    htmlBody?: string;
    htmlHead?: string;
  } = {}
) {
  options = options || {};

  const html = `<!DOCTYPE html>
  <html>
    <head>
      ${options.title ? `<title>${options.title}</title>` : ""}
      ${options.og?.title ? `<meta property="og:title" content="${options.og.title}">` : ""}
      ${frameMetadataToHtml(frame)}
      ${options.htmlHead || ""}
    </head>
    <body>${options.htmlBody}</body>
  </html>`;
  return html;
}
