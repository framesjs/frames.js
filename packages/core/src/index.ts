import {
  CastId,
  FrameActionData,
  FrameActionMessage,
  Message,
  MessageType,
  ValidationResponse,
  VerificationAddEthAddressMessage,
  HubResult,
} from "@farcaster/core";
import * as cheerio from "cheerio";

import { createPublicClient, http, parseAbi } from "viem";
import * as chains from "viem/chains";
import { optimism } from "viem/chains";

type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined;
type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepPartial<U>>
      : T extends {}
        ? {
            [K in keyof T]?: DeepPartial<T[K]>;
          }
        : Partial<T>;

interface HubService {
  validateMessage(
    request: DeepPartial<Message>,
    metadata?: any
  ): Promise<HubResult<ValidationResponse>>;
}

export type ValidateFrameMessageOptions = {
  ignoreSignature?: boolean;
};

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

export function htmlToFrame({
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

export function bytesToHexString(bytes: Uint8Array) {
  return ("0x" + Buffer.from(bytes).toString("hex")) as `0x${string}`;
}

export function normalizeCastId(castId: CastId): {
  fid: number;
  hash: `0x${string}`;
} {
  return {
    fid: castId.fid,
    hash: bytesToHexString(castId.hash),
  };
}

export function getFrameMessageFromRequestBody(body: any) {
  return Message.decode(
    Buffer.from(body?.trustedData?.messageBytes ?? "", "hex")
  );
}

export async function validateFrameMessageWithClient(
  body: any,
  client: HubService,
  options?: ValidateFrameMessageOptions
): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  options = options || {};

  const frameMessage: Message = Message.decode(
    Buffer.from(body?.trustedData?.messageBytes ?? "", "hex")
  );

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

type AddressReturnType<
  Options extends { fallbackToCustodyAddress?: boolean } | undefined,
> = Options extends { fallbackToCustodyAddress: true }
  ? `0x${string}`
  : `0x${string}` | null;

// Function implementation with conditional return type
export async function getAddressForFid<
  Options extends { fallbackToCustodyAddress?: boolean } | undefined,
>({
  fid,
  hubClient,
  options,
}: {
  fid: number;
  hubClient: any;
  options?: Options;
}): Promise<AddressReturnType<Options>> {
  const verificationsResult = await hubClient.getVerificationsByFid({
    fid,
  });
  const verifications = verificationsResult.unwrapOr(null);
  if (verifications?.messages[0]) {
    const {
      data: {
        verificationAddEthAddressBody: { address: addressBytes },
      },
    } = verifications.messages[0] as VerificationAddEthAddressMessage;
    return bytesToHexString(addressBytes);
  } else if (options?.fallbackToCustodyAddress) {
    const publicClient = createPublicClient({
      transport: http(),
      chain: optimism,
    });
    // TODO: Do this async
    const address = await publicClient.readContract({
      abi: parseAbi(["function custodyOf(uint256 fid) view returns (address)"]),
      // TODO Extract into constants file
      address: "0x00000000fc6c5f01fc30151999387bb99a9f489b",
      functionName: "custodyOf",
      args: [BigInt(fid)],
    });
    return address;
  } else {
    return null as AddressReturnType<Options>;
  }
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

export function frameMetadataToNextMetadata(frame: FrameMetadata) {
  const metadata: any = {
    "fc:frame": frame.version,
    "fc:frame:image": frame.image,
    "fc:frame:post_url": frame.postUrl,
    "fc:frame:refresh_period": frame.refreshPeriod,
  };

  frame.buttons?.forEach((button, index) => {
    metadata[`fc:frame:button:${index + 1}`] = button.label;
    metadata[`fc:frame:button:${index + 1}:action`] = button.action;
  });

  return metadata;
}

export function frameMetadataToHtmlText(
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
