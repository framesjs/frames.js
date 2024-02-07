import { Chain } from "viem/chains";

type GetTokenUrlParameters = {
  /** Address of smart contract on the given chain */
  address: string;
  /** Optional ID of token */
  tokenId?: string;
  /** Chain namespace (default: 'eip155') */
  chainNamespace?: string;
} & (
  | {
      /** ID of the chain */
      chainId: string | number;
      chain?: never;
    }
  | {
      chainId?: never;
      /** Object with chain ID as a property (e.g. viem's `Chain` object) */
      chain: Pick<Chain, "id">;
    }
);

/** Constructs a {@link https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md|CAIP-10} compliant URL given the address, chain, and token ID (optional) as inputs */
export function getTokenUrl({
  address,
  tokenId,
  chainNamespace = "eip155",
  chain: chainArg,
  chainId: chainIdArg,
}: GetTokenUrlParameters): string {
  let chainId: string | null = null;

  if (chainIdArg) {
    chainId = chainIdArg.toString();
  } else if (chainArg) {
    chainId = chainArg.id.toString();
  }

  if (!chainId) {
    throw new Error("Invalid chainName or chain object");
  }

  // Construct the CAIP-10 URL
  return `${chainNamespace ? `${chainNamespace}:` : ""}${chainId}:${address}${tokenId ? `:${tokenId}` : ""}`;
}
