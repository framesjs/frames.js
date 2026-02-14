import type { CastId } from "./farcaster";
import { Message, MessageType, Protocol } from "./farcaster";
import type {
  FrameActionPayload,
  FrameButton,
  FrameButtonLink,
  FrameButtonMint,
  FrameButtonTx,
} from "./types";

/**
 * Type guard to check if a frame button is a link button.
 * @param frameButton - The frame button to check
 * @returns True if the button action is "link"
 */
export function isFrameButtonLink(
  frameButton: FrameButton
): frameButton is FrameButtonLink {
  return frameButton.action === "link";
}

/**
 * Type guard to check if a frame button is a transaction button.
 * @param frameButton - The frame button to check
 * @returns True if the button action is "tx"
 */
export function isFrameButtonTx(
  frameButton: FrameButton
): frameButton is FrameButtonTx {
  return frameButton.action === "tx";
}

/**
 * Type guard to check if a frame button is a mint button.
 * @param frameButton - The frame button to check
 * @returns True if the button action is "mint"
 */
export function isFrameButtonMint(
  frameButton: FrameButton
): frameButton is FrameButtonMint {
  return frameButton.action === "mint";
}

/**
 * Converts a Uint8Array of bytes to a hex string prefixed with 0x.
 * @param bytes - The bytes to convert
 * @returns Hex string representation with 0x prefix
 */
export function bytesToHexString(bytes: Uint8Array): `0x${string}` {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

/**
 * Gets the byte length of a string in UTF-8 encoding.
 * @param str - The string to measure
 * @returns The byte length of the string
 */
export function getByteLength(str: string): number {
  return Buffer.from(str).byteLength;
}

/**
 * Converts a hex string to a Uint8Array.
 * @param hexstring - The hex string to convert (without 0x prefix)
 * @returns Uint8Array representation of the hex string
 * @throws Error if the hex string is invalid
 */
export function hexStringToUint8Array(hexstring: string): Uint8Array {
  const matches = hexstring.match(/.{1,2}/g);

  if (!matches) {
    throw new Error("Invalid hex string provided");
  }

  return new Uint8Array(matches.map((byte: string) => parseInt(byte, 16)));
}

/**
 * Normalizes a CastId by converting the hash from Uint8Array to hex string.
 * @param castId - The cast ID to normalize
 * @returns Normalized cast ID with hash as hex string
 */
export function normalizeCastId(castId: CastId): {
  fid: number;
  hash: `0x${string}`;
} {
  return {
    fid: castId.fid,
    hash: bytesToHexString(castId.hash),
  };
}

/**
 * Extracts a Farcaster Message from the trustedData bytes in the `POST` body payload
 */
export function getFrameMessageFromRequestBody(
  body: FrameActionPayload
): Message {
  return Message.decode(Buffer.from(body.trustedData.messageBytes, "hex"));
}

/**
 * Validates whether the version param is valid
 * @param version - the version string to validate
 * @returns true if the provided version conforms to the Frames spec
 */
export function isValidVersion(version: string): boolean {
  // Check if the input is exactly 'vNext'
  if (version === "vNext") {
    return true;
  }

  // Regular expression to match the pattern YYYY-MM-DD
  // ^ asserts position at start of the string
  // \d{4} matches exactly four digits (for the year)
  // - matches the literal "-"
  // \d{2} matches exactly two digits (for the month)
  // - matches the literal "-"
  // \d{2} matches exactly two digits (for the day)
  // $ asserts position at the end of the string
  const pattern = /^\d{4}-\d{2}-\d{2}$/;

  // Test the input against the pattern
  if (!pattern.test(version)) {
    return false;
  }

  return true;
}

/**
 * Gets the key name of an enum by its value.
 * @param enumDefinition - The enum definition object
 * @param enumValue - The enum value to look up
 * @returns The key name corresponding to the value, or empty string if not found
 */
export function getEnumKeyByEnumValue<
  TEnumKey extends string,
  TEnumVal extends string | number,
>(
  enumDefinition: { [key in TEnumKey]: TEnumVal },
  enumValue: TEnumVal
): string {
  return (
    Object.keys(enumDefinition)[
    Object.values(enumDefinition).indexOf(enumValue)
    ] ?? ""
  );
}

/**
 * Extracts the Ethereum address from a Farcaster verification message.
 * @param message - The JSON message containing verification data
 * @returns The extracted Ethereum address or null if not Ethereum protocol
 * @throws Error if message data is invalid or missing required fields
 */
export function extractAddressFromJSONMessage(
  message: unknown
): `0x${string}` | null {
  const { data } = Message.fromJSON(message);

  if (!data) {
    throw new Error("Invalid message provided. Message data is missing");
  }

  if (data.type !== MessageType.VERIFICATION_ADD_ETH_ADDRESS) {
    throw new Error(
      `Invalid message provided. Expected message type to be ${MessageType.VERIFICATION_ADD_ETH_ADDRESS
      } but got ${getEnumKeyByEnumValue(MessageType, data.type)}.`
    );
  }

  if (!data.verificationAddAddressBody) {
    throw new Error(
      "Invalid message provided. Message data is missing verificationAddAddressBody"
    );
  }

  if (data.verificationAddAddressBody.protocol !== Protocol.ETHEREUM) {
    return null;
  }

  /**
   * This is ugly hack but we want to return the address as a string that is expected by the users ( essentially what they see in the response from the hub ).
   * We could use Buffer.from(data.verificationAddAddressBody.address).toString('base64') here but that results in different base64.
   * Therefore we return address from source message and not from decoded message.
   *
   * For example for value 0x8d25687829d6b85d9e0020b8c89e3ca24de20a89 from API we get 0x8d25687829d6b85d9e0020b8c89e3ca24de20a8w== from Buffer.from(...).toString('base64').
   * The values are the same if you compare them as Buffer.from(a).equals(Buffer.from(b)).
   */
  // @TODO type message properly or handle the return type properly
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- we know the data is there
  return (message as Record<string, any>).data.verificationAddAddressBody
    .address as `0x${string}`;
}

/**
 * Used to make sure that the provided value does not cause parsing issues malforming the value.
 */
export function escapeHtmlAttributeValue(value: string): string {
  return value.replace(/["'<>]/g, (char) => {
    switch (char) {
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      default:
        return char;
    }
  });
}
