export type ParsedToken = {
  namespace: string;
  chainId: number;
  address: string;
  tokenId?: string; // Optional
};

/** Parses a [CAIP-10](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md) compliant URL with optional token ID */
export function getTokenFromUrl(url: string): ParsedToken {
  // Split the URL by ':' to get the parts
  const [namespace, chainId, address, tokenId] = url.split(":");

  if (!namespace || !chainId || !address) {
    throw new Error("Invalid token URL");
  }

  const parsedChainId = parseInt(chainId);

  if (Number.isNaN(parsedChainId)) {
    throw new Error("Invalid token URL: chainId is not a valid number");
  }

  return {
    namespace,
    chainId: parsedChainId,
    address,
    tokenId: tokenId || undefined,
  };
}
