import { frames } from "../frames";
import { transaction } from "frames.js/core";

export const POST = frames(async (ctx) => {
  if (!ctx?.message) {
    throw new Error("Invalid frame message");
  }

  if (!ctx.message.address) {
    throw new Error("Address is required, make sure the protocol supports it.");
  }

  return transaction({
    chainId: "eip155:10", // OP Mainnet 10
    method: "eth_sendTransaction",
    params: {
      abi: [],
      to: ctx.message.address,
    },
  });
});
