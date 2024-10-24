export type FarcasterFrameContext = {
  /** Connected address of user, only sent with transaction data request */
  address?: `0x${string}`;
  castId: { hash: `0x${string}`; fid: number };
};
