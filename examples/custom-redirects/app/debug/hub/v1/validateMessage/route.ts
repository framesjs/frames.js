import { NextRequest } from "next/server";
import {
  Message,
  FarcasterNetwork,
  HubError,
  ValidationResponse,
} from "@farcaster/core";

// References:
// https://github.com/farcasterxyz/hub-monorepo/blob/main/apps/hubble/src/rpc/httpServer.ts#L577
// https://github.com/farcasterxyz/hub-monorepo/blob/main/apps/hubble/src/hubble.ts#L1387
// https://github.com/farcasterxyz/hub-monorepo/blob/main/apps/hubble/src/storage/engine/index.ts#L902

/** Mocks the Hub /v1/validateMessage endpoint and skips parts that require a valid signer */
export async function POST(request: NextRequest) {
  console.warn(
    "info: Mock hub: Validating message without verifying signature. This should only be used in development"
  );

  const contentType = request.headers.get("content-type") as string;
  let message;

  if (contentType === "application/octet-stream") {
    // The Posted Body is a serialized Message protobuf
    const reader = request.body?.getReader();
    const bytes = await reader?.read();
    if (!bytes || !bytes.value) {
      return err(
        new HubError(
          "bad_request.validation_failure",
          "Could not parse Message. This API accepts only Message protobufs encoded into bytes (application/octet-stream)"
        )
      );
    }
    message = Message.decode(bytes.value);
  } else {
    return err(
      new HubError(
        "bad_request.validation_failure",
        `Unsupported Media Type. Content-Type ${contentType} is not supported`
      )
    );
  }

  // 1. Ensure message data is present
  if (!message || !message.data) {
    return err(
      new HubError("bad_request.validation_failure", "message data is missing")
    );
  }

  // 2. Check the network
  if (
    ![
      FarcasterNetwork.MAINNET,
      FarcasterNetwork.TESTNET,
      FarcasterNetwork.DEVNET,
    ].includes(message.data.network)
  ) {
    return err(
      new HubError(
        "bad_request.validation_failure",
        `incorrect network: ${message.data.network} (expected: ${FarcasterNetwork.MAINNET} or ${FarcasterNetwork.TESTNET} or ${FarcasterNetwork.DEVNET})`
      )
    );
  }

  // (Skip) 3. Check that the user has a custody address

  // (Partial) 4. Check that the signer is valid
  // Check if signer is present
  if (!message.signer) {
    return err(
      new HubError("bad_request.validation_failure", "signer is missing")
    );
  }

  // (Skip) 5. For fname add UserDataAdd messages, check that the user actually owns the fname

  // (Skip) 6. Check message body and envelope (signatures)

  return Response.json(
    ValidationResponse.toJSON(
      ValidationResponse.create({
        valid: true,
        message: message,
      })
    )
  );
}

function err(error: HubError) {
  return Response.json({ ...error, message: error.message }, { status: 400 });
}
