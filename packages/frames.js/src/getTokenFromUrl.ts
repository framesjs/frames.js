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

  return {
    namespace: namespace,
    chainId: parseInt(chainId),
    address,
    tokenId: tokenId || undefined,
  };
}
