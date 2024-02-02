import {
  FrameActionMessage,
  Message,
  MessageType,
  VerificationAddAddressMessage,
} from "@farcaster/core";
import { HubRpcClient, getSSLHubRpcClient } from "@farcaster/hub-nodejs";
import * as cheerio from "cheerio";
import { createPublicClient, http, parseAbi } from "viem";
import { optimism } from "viem/chains";
import { Button, ButtonsType } from "./types";
import { Frame } from "./types";
import { isValidVersion } from "./utils";
import { bytesToHexString } from "./utils";

export type ValidateFrameMessageOptions = {
  ignoreSignature?: boolean;
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

export function getFrame({
  text,
  url,
}: {
  text: string;
  url?: string;
}): Frame | null {
  const $ = cheerio.load(text);

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

  const buttonLabels = $(
    "meta[property^='fc:frame:button']:not([property$=':action']), meta[name^='fc:frame:button']:not([name$=':action'])"
  )
    .map((i, elem) => parseButtonElement(elem))
    .filter((i, elem) => elem !== null)
    .toArray();

  let refreshPeriod: number | undefined = undefined;

  try {
    const refreshPeriodContent = $(
      `meta[property='fc:frame:refresh_period'], meta[name='fc:frame:refresh_period']`
    ).attr("content");
    refreshPeriod = refreshPeriodContent
      ? parseInt(refreshPeriodContent)
      : undefined;
  } catch (error) {}

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
    );

  // TODO: Useful error messages
  if (
    !version ||
    !isValidVersion(version) ||
    !image ||
    buttonsWithActions.length > 4
  ) {
    return null;
  }

  return {
    version: version as "vNext" | `${number}-${number}-${number}`,
    image: image,
    buttons: buttonsWithActions as ButtonsType,
    postUrl,
    refreshPeriod,
  };
}

export function getFrameMessageFromRequestBody(body: any) {
  return Message.decode(
    Buffer.from(body?.trustedData?.messageBytes ?? "", "hex")
  );
}

export function getHubClient(): HubRpcClient {
  return getSSLHubRpcClient(
    process.env.FRAME_HUB_URL ||
      process.env.HUB_URL ||
      "nemes.farcaster.xyz:2283"
  );
}

export async function validateFrameMessage(
  body: any,
  options?: ValidateFrameMessageOptions
): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  const client = getHubClient();
  return validateFrameMessageWithClient(body, client, options);
}

export async function validateFrameMessageWithClient(
  body: any,
  client: HubRpcClient,
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
        verificationAddAddressBody: { address: addressBytes },
      },
    } = verifications.messages[0] as VerificationAddAddressMessage;
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

export function getFrameHtmlHead(frame: Frame) {
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

export function getFrameNextMetadata(frame: Frame) {
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

export function getFrameHtml(
  frame: Frame,
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
      ${getFrameHtmlHead(frame)}
      ${options.htmlHead || ""}
    </head>
    <body>${options.htmlBody}</body>
  </html>`;
  return html;
}
