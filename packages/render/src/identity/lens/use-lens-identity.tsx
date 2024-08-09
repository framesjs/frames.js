import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConfig, useConnections } from "wagmi";
import { signMessage, signTypedData, switchChain } from "wagmi/actions";
import { LensClient, production } from "@lens-protocol/client";
import { STORAGE_KEYS } from "../constants";
import type {
  SignerStateActionContext,
  SignerStateInstance,
  SignFrameActionFunction,
} from "../../types";
import type { Storage } from "../types";
import { WebStorage } from "../storage";
import type { LensFrameContext } from "./use-lens-context";

export type LensProfile = {
  id: string;
  handle?: string;
};

export type LensSigner = {
  profileId: string;
  accessToken: string;
  identityToken: string;
  handle: string;
  address: `0x${string}`;
};

type LensFrameRequest = {
  clientProtocol: string;
  untrustedData: {
    specVersion: string;
    profileId: string;
    pubId: string;
    url: string;
    buttonIndex: number;
    unixTimestamp: number;
    deadline?: number;
    inputText?: string;
    state?: string;
    actionResponse?: string;
    identityToken: string;
  };
  trustedData: {
    messageBytes: string;
  };
};

type LensSignerInstance = SignerStateInstance<
  LensSigner,
  LensFrameRequest,
  LensFrameContext
> & {
  showProfileSelector: boolean;
  availableProfiles: LensProfile[];
  handleSelectProfile: (profile: LensProfile) => Promise<void>;
  closeProfileSelector: () => void;
};

type LensIdentityOptions = {
  /**
   * @defaultValue WebStorage
   */
  storage?: Storage;
};

export function useLensIdentity({
  storage,
}: LensIdentityOptions = {}): LensSignerInstance {
  // we use ref so we don't instantiate the storage if user passed their own storage
  const storageRef = useRef(storage ?? new WebStorage());
  const [isLoading, setIsLoading] = useState(false);
  const [lensSigner, setLensSigner] = useState<LensSigner | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState<LensProfile[]>([]);
  const connect = useConnectModal();
  const config = useConfig();
  const { address } = useAccount();
  const activeConnection = useConnections();

  const lensClient = useRef(
    new LensClient({
      environment: production,
    })
  ).current;

  useEffect(() => {
    storageRef.current
      .getObject<LensSigner>(STORAGE_KEYS.LENS_PROFILE)
      .then((storedData) => {
        if (storedData) {
          setLensSigner(storedData);
        }
      })
      .catch((e) => {
        // eslint-disable-next-line no-console -- provide feedback
        console.error("@frames.js/render: Could not get the Lens profile", e);
      });
  }, []);

  const logout = useCallback(async () => {
    await storageRef.current.delete(STORAGE_KEYS.LENS_PROFILE);
    setLensSigner(null);
  }, []);

  const handleSelectProfile = useCallback(
    async (profile: LensProfile) => {
      try {
        if (!address) {
          throw new Error("No wallet connected");
        }
        setShowProfileSelector(false);
        const { id, text } = await lensClient.authentication.generateChallenge({
          signedBy: address,
          for: profile.id,
        });
        const signature = await signMessage(config, {
          message: {
            raw:
              typeof text === "string"
                ? Buffer.from(text)
                : Buffer.from(text as Uint8Array),
          },
        });
        await lensClient.authentication.authenticate({ id, signature });
        const accessTokenResult =
          await lensClient.authentication.getAccessToken();
        const identityTokenResult =
          await lensClient.authentication.getIdentityToken();
        const accessToken = accessTokenResult.unwrap();
        const identityToken = identityTokenResult.unwrap();
        const profileId = await lensClient.authentication.getProfileId();
        const profileInfo = await lensClient.profile.fetch({
          forProfileId: profileId,
        });
        const handle = profileInfo?.handle?.localName
          ? `${profileInfo.handle.localName}.lens`
          : "";

        if (profileId) {
          const signer: LensSigner = {
            accessToken,
            profileId,
            address,
            identityToken,
            handle,
          };

          await storageRef.current.setObject<LensSigner>(
            STORAGE_KEYS.LENS_PROFILE,
            signer
          );

          setLensSigner(signer);
        }
      } catch (error) {
        // eslint-disable-next-line no-console -- provide feedback
        console.error("@frames.js/render: Create Lens signer failed", error);
      }
    },
    [address, config, lensClient.authentication, lensClient.profile]
  );

  const onSignerlessFramePress = useCallback(async () => {
    try {
      setIsLoading(true);

      if (!lensSigner) {
        if (!address) {
          connect.openConnectModal?.();
          return;
        }
        const managedProfiles = await lensClient.wallet.profilesManaged({
          for: address,
        });
        const profiles: LensProfile[] = managedProfiles.items.map((p) => ({
          id: p.id,
          handle: p.handle ? `${p.handle.localName}.lens` : undefined,
        }));

        if (!profiles[0]) {
          throw new Error("No Lens profiles managed by connected address");
        }

        if (managedProfiles.items.length > 1) {
          setAvailableProfiles(profiles);
          setShowProfileSelector(true);
        } else {
          await handleSelectProfile(profiles[0]);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- provide feedback
      console.error("@frames.js/render: Create Lens signer failed", error);
    } finally {
      setIsLoading(false);
    }
  }, [address, connect, handleSelectProfile, lensClient.wallet, lensSigner]);

  const signFrameAction: SignFrameActionFunction<
    SignerStateActionContext<LensSigner, LensFrameContext>,
    LensFrameRequest
  > = useCallback(
    async (actionContext) => {
      if (!lensSigner) {
        throw new Error("No lens signer active");
      }
      const profileManagers = await lensClient.profile.managers({
        for: lensSigner.profileId,
      });
      const lensManagerEnabled = profileManagers.items.some(
        (manager) => manager.isLensManager
      );
      if (lensManagerEnabled) {
        const result = await lensClient.frames.signFrameAction({
          url: actionContext.url,
          inputText: actionContext.inputText || "",
          state: actionContext.state || "",
          buttonIndex: actionContext.buttonIndex,
          actionResponse:
            actionContext.type === "tx-post" ? actionContext.transactionId : "",
          profileId: lensSigner.profileId,
          pubId: actionContext.frameContext.pubId || "",
          specVersion: "1.0.0",
        });

        if (result.isFailure()) {
          throw new Error("credential expired or not authenticated");
        }

        const searchParams = new URLSearchParams({
          postType:
            actionContext.type !== "default"
              ? "post"
              : actionContext.frameButton.action,
          postUrl:
            actionContext.frameButton.target ?? actionContext.target ?? "",
        });

        return {
          body: {
            clientProtocol: "lens@1.0.0",
            untrustedData: {
              ...result.value.signedTypedData.value,
              identityToken: lensSigner.identityToken,
              unixTimestamp: Date.now(),
            },
            trustedData: {
              messageBytes: result.value.signature,
            },
          },
          searchParams,
        };
      }

      const typedData = await lensClient.frames.createFrameTypedData({
        url: actionContext.url,
        inputText: actionContext.inputText || "",
        state: actionContext.state || "",
        buttonIndex: actionContext.buttonIndex,
        actionResponse:
          actionContext.type === "tx-post" ? actionContext.transactionId : "",
        profileId: lensSigner.profileId,
        pubId: actionContext.frameContext.pubId || "",
        specVersion: "1.0.0",
        deadline: Math.floor(Date.now() / 1000) + 86400, // 1 day
      });

      if (activeConnection[0]?.chainId !== typedData.domain.chainId) {
        await switchChain(config, { chainId: typedData.domain.chainId });
      }

      const signature = await signTypedData(config, {
        domain: {
          ...typedData.domain,
          verifyingContract: typedData.domain
            .verifyingContract as `0x${string}`,
        },
        types: typedData.types,
        message: typedData.value,
        primaryType: "FrameData",
      });

      const searchParams = new URLSearchParams({
        postType:
          actionContext.type !== "default"
            ? "post"
            : actionContext.frameButton.action,
        postUrl: actionContext.target ?? "",
      });

      return {
        body: {
          clientProtocol: "lens@1.0.0",
          untrustedData: {
            ...typedData.value,
            identityToken: lensSigner.identityToken,
            unixTimestamp: Date.now(),
          },
          trustedData: {
            messageBytes: signature,
          },
        },
        searchParams,
      };
    },
    [
      activeConnection,
      config,
      lensClient.frames,
      lensClient.profile,
      lensSigner,
    ]
  );

  const closeProfileSelector = useCallback(() => {
    setShowProfileSelector(false);
  }, []);

  return useMemo(
    () => ({
      signer: lensSigner,
      hasSigner: !!lensSigner?.accessToken,
      signFrameAction,
      isLoadingSigner: isLoading,
      onSignerlessFramePress,
      logout,
      showProfileSelector,
      closeProfileSelector,
      availableProfiles,
      handleSelectProfile,
    }),
    [
      availableProfiles,
      closeProfileSelector,
      handleSelectProfile,
      isLoading,
      lensSigner,
      logout,
      onSignerlessFramePress,
      showProfileSelector,
      signFrameAction,
    ]
  );
}
