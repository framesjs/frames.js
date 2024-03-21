import { STORAGE_REGISTRY_ADDRESS } from "@farcaster/core";
import { TransactionTargetResponse } from "frames.js";
import { getFrameMessage } from "frames.js/next/server";
import { NextRequest, NextResponse } from "next/server";
import {
  Abi,
  createPublicClient,
  encodeFunctionData,
  getContract,
  http,
} from "viem";
import { optimism } from "viem/chains";
import { storageRegistryABI } from "./contracts/storage-registry";

export async function POST(
  req: NextRequest
): Promise<NextResponse<TransactionTargetResponse>> {
  const json = await req.json();

  const frameMessage = await getFrameMessage(json);

  if (!frameMessage) {
    throw new Error("No frame message");
  }

  // Get current storage price
  const units = 1n;

  const calldata = encodeFunctionData({
    abi: storageRegistryABI,
    functionName: "rent",
    args: [BigInt(frameMessage.requesterFid), units],
  });

  const publicClient = createPublicClient({
    chain: optimism,
    transport: http(),
  });

  const storageRegistry = getContract({
    address: STORAGE_REGISTRY_ADDRESS,
    abi: storageRegistryABI,
    publicClient,
  });

  const unitPrice = await storageRegistry.read.price([units]);

  return NextResponse.json({
    chainId: "eip155:10", // OP Mainnet 10
    method: "eth_sendTransaction",
    params: {
      abi: storageRegistryABI as Abi,
      to: STORAGE_REGISTRY_ADDRESS,
      data: calldata,
      value: unitPrice.toString(),
    },
  });
}
