import { NextRequest, NextResponse } from "next/server";
import { mnemonicToAccount } from "viem/accounts";
import {
  PublicKeyBundle,
  SignedPublicKeyBundle,
  signPublicKeyBundle,
} from "frames.js/ethereum";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";

export async function POST(req: NextRequest) {
  if (process.env.SIGNER_URL) {
    console.log("redirecting to public signer url configured by SIGNER_URL");

    return NextResponse.redirect(
      new URL("/ethereum", process.env.SIGNER_URL).toString(),
      {
        status: 307,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } else if (
    !process.env.FARCASTER_DEVELOPER_FID ||
    !process.env.FARCASTER_DEVELOPER_MNEMONIC
  ) {
    console.warn(
      "FARCASTER_DEVELOPER_FID or FARCASTER_DEVELOPER_MNEMONIC not set, using frames.js debugger hosted signer"
    );

    return NextResponse.redirect("https://debugger.framesjs.org/signer", {
      status: 307,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const { publicKeyBundle, walletSignature, walletAddress } =
      (await req.json()) as {
        publicKeyBundle: PublicKeyBundle;
        walletSignature: `0x${string}`;
        walletAddress: `0x${string}`;
      };

    const appFid = process.env.FARCASTER_DEVELOPER_FID!;
    const account = mnemonicToAccount(
      process.env.FARCASTER_DEVELOPER_MNEMONIC!
    );

    const appWalletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(),
    });

    const appSignature = await signPublicKeyBundle(
      publicKeyBundle,
      // @ts-expect-error -- wallet has weird type issue
      appWalletClient
    );

    const signedPublicKeyBundle: SignedPublicKeyBundle = {
      public_key_bundle: publicKeyBundle,
      wallet_address: walletAddress,
      wallet_signature: walletSignature,
      app_address: appWalletClient.account.address,
      app_signature: appSignature,
    };

    return Response.json(
      {
        signedPublicKeyBundle,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error(err);
    const res = NextResponse.error();
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }
}
