import { AppMetadataTypes } from "frames.js/ethereum";

export const LOCAL_STORAGE_KEYS = {
  FARCASTER_IDENTITIES: "farcasterIdentities",
  XMTP_SIGNER: "xmtpSigner",
  LENS_PROFILE: "lensProfile",
  ETHEREUM_SIGNER: "ethereumSigner",
  SELECTED_PROTOCOL: "selectedProtocol",
  FARCASTER_FRAME_CONTEXT: "farcasterFrameContext",
  XMTP_FRAME_CONTEXT: "xmtpFrameContext",
  LENS_FRAME_CONTEXT: "lensFrameContext",
};

export const ETH_APP_METADATA: AppMetadataTypes["1"] = {
  name: "frames.jd debugger",
  description: "A debugger for frames.js",
  iconUrl: "https://debugger.framesjs.org/favicon.ico",
  url: "https://debugger.framesjs.org",
};
