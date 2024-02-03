import {
  CastId,
  NobleEd25519Signer,
  makeFrameAction,
  FarcasterNetwork,
  Message,
} from "@farcaster/core";

export async function createFrameActionMessageWithSignerKey(
  signerKey: string,
  {
    fid,
    url,
    buttonIndex,
    castId,
    inputText,
  }: {
    fid: number;
    url: Uint8Array;
    buttonIndex: number;
    inputText: Uint8Array;
    castId: CastId | undefined;
  }
) {
  const signer = new NobleEd25519Signer(Buffer.from(signerKey.slice(2), "hex"));

  const messageDataOptions = {
    fid,
    network: FarcasterNetwork.MAINNET,
  };

  const message = await makeFrameAction(
    {
      url,
      buttonIndex,
      castId,
      inputText,
    },
    messageDataOptions,
    signer
  );

  if (message.isErr()) {
    console.error(message.error);
  }

  const trustedBytes = Buffer.from(
    Message.encode(message._unsafeUnwrap()).finish()
  ).toString("hex");

  return { message: message.unwrapOr(null), trustedBytes: trustedBytes };
}
