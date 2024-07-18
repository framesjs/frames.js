interface User {
  fid: number;
  username: string;
  display_name?: string;
  custody_address: string;
  pfp_url?: string;
  profile: {
    bio: {
      text: string;
      mentioned_profiles: string[];
    };
  };
  follower_count: number;
  following_count: number;
  verifications: string[];
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
  power_badge: boolean;
  viewer_context?: {
    following: boolean;
    followed_by: boolean;
  };
}

export declare const CastNotificationType: {
  readonly Mention: "cast-mention";
  readonly Reply: "cast-reply";
};

export declare const FrameButtonActionType: {
  readonly Post: "post";
  readonly PostRedirect: "post_redirect";
  readonly Tx: "tx";
};

export declare const ChannelObjectEnum: {
  readonly Channel: "channel";
};

export interface ValidateFrameActionResponse {
  valid: boolean;
  action: {
    url: string;
    interactor: User;
    tapped_button: {
      index: number;
    };
    input?: {
      text?: string;
    };
    state: {
      serialized?: string;
    };
    cast: {
      hash: string;
      parent_hash: string | null;
      parent_url: string | null;
      root_parent_url: string | null;
      parent_author: {
        fid: number | null;
      };
      author: User;
      text: string;
      timestamp: string;
      embeds:
        | {
            cast_id: {
              fid: number;
              hash: string;
            };
          }[]
        | {
            url: string;
          }[];
      type?: (typeof CastNotificationType)[keyof typeof CastNotificationType];
      frames?: {
        version: string;
        image: string;
        buttons?: {
          title?: string;
          index: number;
          action_type: (typeof FrameButtonActionType)[keyof typeof FrameButtonActionType];
          target?: string;
          post_url?: string;
        }[];
        post_url?: string;
        frames_url: string;
        title?: string;
        image_aspect_ratio?: string;
        input?: {
          text?: string;
        };
        state?: {
          serialized?: string;
        };
      }[];
      replies: {
        count: number;
      };
      thread_hash: string | null;
      mentioned_profiles: User[];
      channel?: {
        id: string;
        url: string;
        name?: string;
        description?: string;
        object: (typeof ChannelObjectEnum)[keyof typeof ChannelObjectEnum];
        created_at?: number;
        follower_count?: number;
        image_url?: string;
        parent_url?: string;
        lead?: User;
        hosts?: User[];
        viewer_context?: {
          following: boolean;
        };
      };
      viewer_context?: {
        liked: boolean;
        recasted: boolean;
      };
    };
    timestamp: string;
    signer?: {
      client?: User;
    };
    transaction?: {
      hash: string;
    };
    address?: string;
  };
  signature_temporary_object: {
    hash: string;
    hash_scheme: string;
    note: string;
    signature: string;
    signature_scheme: string;
    signer: string;
  };
}
