import { encodeAbiParameters } from "viem";

export function attribution(fid: number): `0x${string}` {
  return encodeAbiParameters(
    [{ type: "bytes1" }, { type: "uint32" }],
    ["0xfc", fid]
  );
}
