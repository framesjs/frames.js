export type FarcasterFrameContext = {
  /**
   * Connected address of user, only sent with transaction data request.
   *
   * @deprecated - not used
   */
  address?: `0x${string}`;
  castId: { hash: `0x${string}`; fid: number };
};
