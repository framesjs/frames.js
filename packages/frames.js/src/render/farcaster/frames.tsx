import {
  CastId,
  NobleEd25519Signer,
  makeFrameAction,
  FarcasterNetwork,
  Message,
  FrameActionBody,
  FrameActionMessage,
} from "@farcaster/core";
import { FrameButton } from "../../types";
import { FrameActionBodyPayload, FrameContext } from "../types";
import { FarcasterSignerState } from "./signers";
import { hexToBytes } from "viem";

export interface FarcasterFrameActionBodyPayload
  extends FrameActionBodyPayload {}

export type FarcasterFrameContext = {
  /** Connected address of user, only sent with transaction data request */
  connectedAddress?: string;
  castId: { hash: `0x${string}`; fid: number };
};

/** Creates a frame action for use with `useFrame` and a proxy */
export const signFrameAction = async ({
  buttonIndex,
  frameContext,
  frameButton,
  signer,
  target,
  inputText,
  state,
  url,
}: {
  target?: string;
  frameButton: FrameButton;
  buttonIndex: number;
  url: string;
  signer: FarcasterSignerState["signer"];
  inputText?: string;
  state?: string;
  frameContext: FrameContext;
}): Promise<{
  body: object;
  searchParams: URLSearchParams;
}> => {
  if (!signer?.fid) {
    throw new Error("Missing signer fid to sign message");
  }
  if (!signer.privateKey) {
    throw new Error("Missing Farcaster signer to sign message");
  }

  const { message, trustedBytes } = await createFrameActionMessageWithSignerKey(
    signer.privateKey,
    {
      fid: signer.fid,
      buttonIndex,
      castId: {
        fid: frameContext.castId.fid,
        hash: hexToBytes(frameContext.castId.hash),
      },
      state: state !== undefined ? Buffer.from(state) : undefined,
      url: Buffer.from(url),
      // it seems the message in hubs actually requires a value here.
      inputText: inputText !== undefined ? Buffer.from(inputText) : undefined,
      address:
        frameContext.connectedAddress !== undefined
          ? hexToBytes(frameContext.connectedAddress as `0x${string}`)
          : undefined,
    }
  );

  if (!message) {
    throw new Error("hub error");
  }

  const searchParams = new URLSearchParams({
    postType: frameButton?.action || "post",
    postUrl: target ?? "",
  });

  return {
    searchParams: searchParams,
    body: {
      untrustedData: {
        fid: signer.fid,
        url: url,
        messageHash: `0x${Buffer.from(message.hash).toString("hex")}`,
        timestamp: message.data.timestamp,
        network: 1,
        buttonIndex: Number(message.data.frameActionBody.buttonIndex),
        castId: {
          fid: frameContext.castId.fid,
          hash: frameContext.castId.hash,
        },
        inputText,
        address: frameContext.connectedAddress,
      },
      trustedData: {
        messageBytes: trustedBytes,
      },
    },
  };
};

export async function createFrameActionMessageWithSignerKey(
  signerKey: string,
  {
    fid,
    url,
    buttonIndex,
    castId,
    inputText,
    state,
    address,
  }: {
    fid: number;
    url: Uint8Array;
    buttonIndex: number;
    inputText: Uint8Array | undefined;
    castId: CastId;
    state: Uint8Array | undefined;
    address: Uint8Array | undefined;
  }
): Promise<
  | {
      message: null;
      trustedBytes: null;
    }
  | {
      message: FrameActionMessage | null;
      trustedBytes: string;
    }
> {
  const signer = new NobleEd25519Signer(Buffer.from(signerKey.slice(2), "hex"));

  const messageDataOptions = {
    fid,
    network: FarcasterNetwork.MAINNET,
  };

  const message = await makeFrameAction(
    FrameActionBody.create({
      url,
      buttonIndex,
      castId,
      state,
      inputText: inputText !== undefined ? Buffer.from(inputText) : undefined,
      address,
    }),
    messageDataOptions,
    signer
  );

  if (message.isErr()) {
    return { message: null, trustedBytes: null };
  }

  const trustedBytes = Buffer.from(
    Message.encode(message._unsafeUnwrap()).finish()
  ).toString("hex");

  return { message: message.unwrapOr(null), trustedBytes: trustedBytes };
}
