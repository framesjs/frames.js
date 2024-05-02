declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * The URL used to create real farcaster signer.
       * If not provided it will use the local signer if FARCASTER_DEVELOPER_FID and FARCASTER_DEVELOPER_MNEMONIC are set,
       * otherwise it will use https://debugger.framesjs.org/signer
       */
      SIGNER_URL: string | undefined;
      /**
       * Used in combination with FARCASTER_DEVELOPER_FID if SIGNER_URL is not provided.
       */
      FARCASTER_DEVELOPER_MNEMONIC: string | undefined;
      /**
       * Used in combination with FARCASTER_DEVELOPER_MNEMONIC if SIGNER_URL is not provided.
       */
      FARCASTER_DEVELOPER_FID: string | undefined;
    }
  }
}

export {};
