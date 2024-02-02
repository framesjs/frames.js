import { FrameActionMessage, Message, MessageType } from "@farcaster/core";
import { HubRpcClient } from "@farcaster/hub-nodejs";
import { FrameActionPayload } from ".";

export async function validateFrameMessageWithClient(
  body: FrameActionPayload,
  client: HubRpcClient
): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  const frameMessage: Message = Message.decode(
    Buffer.from(body.trustedData.messageBytes ?? "", "hex")
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
