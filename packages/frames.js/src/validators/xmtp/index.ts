import { validateFramesPost, UntrustedData } from "@xmtp/frames-validator";
import {
  BaseFrameActionDataParsed,
  BaseFrameActionPayload,
  ProtocolValidator,
} from "../..";

type XmtpFrameActionDataParsed = BaseFrameActionDataParsed<{
  verifiedWalletAddress: string;
}>;

export function isXmtpFrameAction(
  actionDataParsed: BaseFrameActionDataParsed
): actionDataParsed is XmtpFrameActionDataParsed {
  // Assuming there's a specific property or characteristic that can be checked
  // For demonstration, let's say FarcasterFrameActionDataParsed has a unique property `farcasterProperty`
  return (actionDataParsed as XmtpFrameActionDataParsed).hasOwnProperty(
    "verifiedWalletAddress"
  );
}

export const xmtpValidator: ProtocolValidator<
  BaseFrameActionPayload<UntrustedData>,
  {},
  BaseFrameActionDataParsed<{ verifiedWalletAddress: string }>
> = {
  clientProtocolId: "xmtp@vNext",
  async validate(frameActionBody) {
    if (!this.canValidate(frameActionBody)) {
      return null;
    }
    try {
      const { actionBody, verifiedWalletAddress } = await validateFramesPost({
        ...frameActionBody,
        clientProtocol: frameActionBody.clientProtocol as `xmtp@${string}`,
      });
      return {
        isValid: true,
        buttonIndex: actionBody.buttonIndex,
        verifiedWalletAddress,
      };
    } catch (error) {
      return null;
    }
  },
  canValidate(frameActionPayload) {
    return (
      !!frameActionPayload.clientProtocol &&
      frameActionPayload.clientProtocol.startsWith("xmtp@")
    );
  },
} as const;
