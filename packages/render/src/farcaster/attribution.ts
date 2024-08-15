import { encodePacked } from "viem";

export function attribution(fid: number): `0x${string}` {
  return encodePacked(["bytes1", "uint32"], ["0xfc", fid]);
}
