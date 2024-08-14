"use client";

import { SignerStateInstance } from "@frames.js/render";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConfig, useConnections } from "wagmi";
import { signMessage, signTypedData, switchChain } from "wagmi/actions";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { LensFrameContext } from "./use-lens-context";
import { Profile } from "../components/lens-profile-select";
import { LensClient, production } from "@lens-protocol/client";

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
    deadline: number;
    inputText: string;
    state: string;
    actionResponse: string;
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
  availableProfiles: Profile[];
  handleSelectProfile: (profile: Profile) => void;
  closeProfileSelector: () => void;
};

export function useLensIdentity(): LensSignerInstance {
  const [isLoading, setLoading] = useState(false);
  const [lensSigner, setLensSigner] = useState<LensSigner | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const connect = useConnectModal();
  const config = useConfig();
  const { address } = useAccount();
  const activeConnection = useConnections();

  const lensClient = useRef(
    new LensClient({
      environment: production,
    })
  ).current;

  function getSignerFromLocalStorage() {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEYS.LENS_PROFILE);
      if (storedData) {
        const signerRaw = JSON.parse(storedData);
        const signer: LensSigner = {
          profileId: signerRaw.profileId,
          accessToken: signerRaw.accessToken,
          identityToken: signerRaw.identityToken,
          address: signerRaw.address,
          handle: signerRaw.handle,
        };
        return signer;
      }
      return null;
    }

    return null;
  }

  useEffect(() => {
    const signer = getSignerFromLocalStorage();
    if (signer) setLensSigner(signer);
  }, []);

  function logout() {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LENS_PROFILE);
    setLensSigner(null);
  }

  async function onSignerlessFramePress() {
    setLoading(true);
    await createAndStoreSigner();
    setLoading(false);
  }

  async function handleSelectProfile(profile: Profile) {
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
      const handle = profileInfo?.handle?.localName + ".lens" || "";
      if (profileId) {
        const signer = {
          accessToken,
          profileId,
          address,
          identityToken,
          handle,
        };
        setLensSigner(signer);

        localStorage.setItem(
          LOCAL_STORAGE_KEYS.LENS_PROFILE,
          JSON.stringify(signer)
        );
      }
    } catch (error) {
      console.error("frames.js: Create Lens signer failed", error);
    }
  }

  async function createAndStoreSigner() {
    try {
      if (!lensSigner) {
        if (!address) {
          connect.openConnectModal?.();
          return;
        }
        const managedProfiles = await lensClient.wallet.profilesManaged({
          for: address,
        });
        const profiles: Profile[] = managedProfiles.items.map((p) => ({
          id: p.id,
          handle: p.handle ? p.handle.localName + ".lens" : undefined,
        }));
        if (!profiles[0]) {
          throw new Error("No Lens profiles managed by connected address");
        }
        if (managedProfiles.items.length > 1) {
          setAvailableProfiles(profiles);
          setShowProfileSelector(true);
        } else {
          handleSelectProfile(profiles[0]);
        }
      }
    } catch (error) {
      console.error("frames.js: Create Lens signer failed", error);
    }
  }

  return {
    signer: lensSigner,
    hasSigner: !!lensSigner?.accessToken,
    async signFrameAction(actionContext) {
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
      } else {
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
      }
    },
    isLoadingSigner: isLoading,
    onSignerlessFramePress,
    logout,
    showProfileSelector,
    closeProfileSelector: () => setShowProfileSelector(false),
    availableProfiles,
    handleSelectProfile,
  };
}
