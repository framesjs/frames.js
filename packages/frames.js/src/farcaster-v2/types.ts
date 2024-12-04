import type { PartialDeep } from "type-fest";

export type FrameConfig = {
  version: string;
  /**
   * App Name
   */
  name: string;
  /**
   * Default launch URL
   */
  homeUrl: string;
  /**
   * 200x200 frame application icon URL. Must be less than 1MB
   */
  iconUrl: string;
  /**
   * 200x200px splash image URL. Must be less than 1MB.
   */
  splashImageUrl?: string;
  /**
   * Hex color code.
   *
   * @example "#000000"
   */
  splashBackgroundColor?: string;
  /**
   * URL to which clients will POST events.
   * Required if the frame application uses notifications.
   */
  webhookUrl?: string;
};

export type FarcasterManifest = {
  /**
   * Metadata associating the domain with a Farcaster account.
   *
   * @example
   * ```
   * import { constructJSONFarcasterSignatureAccountAssociationPaylod, sign } from 'frames.js/farcaster-v2/json-signature';
   * {
   *  accountAssociation: await sign({
   *    fid: 0, // your account FID
   *    signer: {
   *      type: "custody",
   *      custodyAddress: "0x1234567890abcdef1234567890abcdef12345678"
   *    },
   *    payload: constructJSONFarcasterSignatureAccountAssociationPaylod('your-domain.tld'),
   *    signMessage: async (message) => {
   *     return account.signMessage({ message });
   *    }
   *  }),
   * }
   * ```
   */
  accountAssociation: {
    /**
     * Base64 url encoded JFS header
     */
    header: string;
    /**
     * Base64 url encoded JFS payload
     */
    payload: string;
    /**
     * Base64 url encoded JFS signature
     */
    signature: string;
  };
  /**
   * Frame configuration
   */
  frame: FrameConfig;
  triggers?: TriggerConfig[];
};

export type TriggerConfig =
  | {
      type: "cast";
      /**
       * Unique ID. Required. Reported to the frame.
       *
       * @example "yoink-score"
       */
      id: string;
      /**
       * Handler URL. Required.
       */
      url: string;
      /**
       * Name override. Optional, defaults to FrameConfig.name
       *
       * @example "View Yoink Score"
       */
      name?: string;
    }
  | {
      type: "composer";
      /**
       * Unique ID. Required. Reported to the frame.
       *
       * @example "yoink-score"
       */
      id: string;
      /**
       * Handler URL. Required.
       */
      url: string;
      /**
       * Name override. Optional, defaults to FrameConfig.name
       *
       * @example "View Yoink Score"
       */
      name?: string;
    };

export type Frame = {
  /**
   * Frame spec version
   */
  version: string;
  /**
   * Frame image. Must be 3:2 aspect ratio. Must be less than 10 MB.
   */
  imageUrl: string;
  button: {
    /**
     * Button text.
     */
    title: string;
    /**
     * Action attributes
     */
    action: {
      /**
       * Must be 'launch_frame'
       */
      type: "launch_frame";
      /**
       * App name
       */
      name: string;
      /**
       * Frame launch URL
       */
      url: string;
      /**
       * URL to splash image, must 200x200px, less than 1MB
       */
      splashImageUrl: string;
      /**
       * Hex color code for splash background
       *
       * @example "#000000"
       */
      splashBackgroundColor: string;
    };
  };
};

export type PartialFarcasterManifest = PartialDeep<
  Omit<FarcasterManifest, "triggers"> & {
    triggers?: PartialDeep<TriggerConfig>[];
  }
>;
