import {
  CastId,
  NobleEd25519Signer,
  makeFrameAction,
  FarcasterNetwork,
  Message,
} from "@farcaster/core";
import { LOCAL_STORAGE_KEYS } from "../constants";

function getSigner(privateKey: string): NobleEd25519Signer {
  const ed25519Signer = new NobleEd25519Signer(
    Buffer.from(privateKey.slice(2), "hex")
  );
  return ed25519Signer;
}

function getSignerFromStorage(
  key: string = LOCAL_STORAGE_KEYS.FARCASTER_SIGNER_PRIVATE_KEY
): NobleEd25519Signer {
  const privateKey = localStorage.getItem(key);
  return getSigner(privateKey);
}

export async function createFrameActionMessage({
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
}) {
  const signer = getSignerFromStorage();

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
