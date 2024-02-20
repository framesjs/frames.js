import { NextRequest, NextResponse } from "next/server";
import { mnemonicToAccount } from "viem/accounts";

if (
  !process.env.FARCASTER_DEVELOPER_MNEMONIC ||
  !process.env.FARCASTER_DEVELOPER_FID
) {
  console.warn(
    "define the FARCASTER_DEVELOPER_MNEMONIC and FARCASTER_DEVELOPER_FID environment variables"
  );
}

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

export async function POST(req: NextRequest, res: NextResponse) {
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

    return Response.json({
      signature,
      requestFid: parseInt(appFid),
      deadline,
      requestSigner: account.address,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.error();
  }
}
