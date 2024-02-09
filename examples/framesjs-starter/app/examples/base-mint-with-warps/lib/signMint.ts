import { Hex, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import {
  MINTER_CONTRACT as _MINTER_CONTRACT,
  SIGNER_PRIVATE_KEY as _SIGNER_PRIVATE_KEY,
} from "../config";

const SIGNER_PRIVATE_KEY = (_SIGNER_PRIVATE_KEY ?? "0x00") as Hex;
const MINTER_CONTRACT = (_MINTER_CONTRACT ?? zeroAddress) as Hex;

const chainId = base.id;

const domain = {
  name: "Farcaster Frame Zora Minter",
  version: "1",
  chainId,
  verifyingContract: MINTER_CONTRACT,
} as const;

export const types = {
  Mint: [
    { name: "to", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "fid", type: "uint256" },
  ],
} as const;

interface MintData {
  to: Hex;
  tokenId: number;
  fid: number;
}

async function signMintData(mintData: MintData): Promise<Hex> {
  const account = privateKeyToAccount(SIGNER_PRIVATE_KEY);

  return account.signTypedData({
    domain,
    types,
    primaryType: "Mint",
    message: {
      to: mintData.to,
      tokenId: BigInt(mintData.tokenId),
      fid: BigInt(mintData.fid),
    },
  });
}

export default signMintData;
