import { NextRequest, NextResponse } from "next/server";
import { mnemonicToAccount } from "viem/accounts";

const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
  name: "Farcaster SignedKeyRequestValidator",
  version: "1",
  chainId: 10,
  verifyingContract: "0x00000000fc700472606ed4fa22623acf62c60553",
} as const;

const SIGNED_KEY_REQUEST_TYPE = [
  { name: "requestFid", type: "uint256" },
  { name: "key", type: "bytes" },
  { name: "deadline", type: "uint256" },
] as const;

export async function POST(req: NextRequest) {
  if (process.env.SIGNER_URL) {
    console.log("redirecting to public signer url configured by SIGNER_URL");

    return NextResponse.redirect(new URL(process.env.SIGNER_URL).toString(), {
      status: 307,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
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
    const { publicKey } = await req.json();

    const appFid = process.env.FARCASTER_DEVELOPER_FID!;
    const account = mnemonicToAccount(
      process.env.FARCASTER_DEVELOPER_MNEMONIC!
    );

    const deadline = Math.floor(Date.now() / 1000) + 86400; // signature is valid for 1 day
    const signature = await account.signTypedData({
      domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
      types: {
        SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE,
      },
      primaryType: "SignedKeyRequest",
      message: {
        requestFid: BigInt(appFid),
        key: publicKey,
        deadline: BigInt(deadline),
      },
    });

    return Response.json(
      {
        signature,
        requestFid: parseInt(appFid),
        deadline,
        requestSigner: account.address,
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
