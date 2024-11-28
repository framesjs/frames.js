import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useConnections,
  useSignTypedData,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { LensClient, development, production } from "@lens-protocol/client";
import type {
  SignerStateActionContext,
  SignerStateInstance,
  SignFrameActionFunction,
} from "../../types";
import type { Storage } from "../types";
import { WebStorage } from "../storage";
import { useFreshRef } from "../../hooks/use-fresh-ref";
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
  /**
   * @defaultValue "lensProfile"
   */
  storageKey?: string;
  /**
   * @defaultValue "production"
   */
  environment?: "production" | "development";
};

const defaultStorage = new WebStorage();

export function useLensIdentity({
  storage = defaultStorage,
  storageKey = "lensProfile",
  environment = "production",
}: LensIdentityOptions = {}): LensSignerInstance {
  const storageRef = useRef(storage);
  const [isLoading, setIsLoading] = useState(false);
  const [lensSigner, setLensSigner] = useState<LensSigner | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState<LensProfile[]>([]);
  const connect = useConnectModal();
  const { address } = useAccount();
  const activeConnection = useConnections();
  const lensSignerRef = useFreshRef(lensSigner);
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();
  const storageKeyRef = useFreshRef(storageKey);
  const addressRef = useFreshRef(address);

  const lensClient = useRef(
    new LensClient({
      environment: environment === "development" ? development : production,
    })
  ).current;

  const connectRef = useFreshRef(connect);

  useEffect(() => {
    storageRef.current
      .get<LensSigner>(storageKey)
      .then((storedData) => {
        if (storedData) {
          setLensSigner(storedData);
        }
      })
      .catch((e) => {
        // eslint-disable-next-line no-console -- provide feedback
        console.error("@frames.js/render: Could not get the Lens profile", e);
      });
  }, [storageKey]);

  const logout = useCallback(async () => {
    await storageRef.current.delete(storageKeyRef.current);
    setLensSigner(null);
  }, [storageKeyRef]);

  const handleSelectProfile = useCallback(
    async (profile: LensProfile) => {
      try {
        const walletAddress = addressRef.current;

        if (!walletAddress) {
          throw new Error("No wallet connected");
        }

        setShowProfileSelector(false);

        const { id, text } = await lensClient.authentication.generateChallenge({
          signedBy: walletAddress,
          for: profile.id,
        });
        const signature = await signMessageAsync({
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
            address: walletAddress,
            identityToken,
            handle,
          };

          await storageRef.current.set<LensSigner>(
            storageKeyRef.current,
            () => signer
          );

          setLensSigner(signer);
        }
      } catch (error) {
        // eslint-disable-next-line no-console -- provide feedback
        console.error("@frames.js/render: Create Lens signer failed", error);
      }
    },
    [
      addressRef,
      lensClient.authentication,
      lensClient.profile,
      signMessageAsync,
      storageKeyRef,
    ]
  );

  const onSignerlessFramePress = useCallback(async () => {
    try {
      setIsLoading(true);

      const signer = lensSignerRef.current;
      const currentAddress = addressRef.current;

      if (signer) {
        return;
      }

      if (!currentAddress) {
        connectRef.current.openConnectModal?.();
        return;
      }

      const managedProfiles = await lensClient.wallet.profilesManaged({
        for: currentAddress,
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
    } catch (error) {
      // eslint-disable-next-line no-console -- provide feedback
      console.error("@frames.js/render: Create Lens signer failed", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    addressRef,
    connectRef,
    handleSelectProfile,
    lensClient.wallet,
    lensSignerRef,
  ]);

  const activeConnectionRef = useFreshRef(activeConnection);

  const signFrameAction: SignFrameActionFunction<
    SignerStateActionContext<LensSigner, LensFrameContext>,
    LensFrameRequest
  > = useCallback(
    async (actionContext) => {
      const signer = lensSignerRef.current;

      if (!signer) {
        throw new Error("No lens signer active");
      }

      const profileManagers = await lensClient.profile.managers({
        for: signer.profileId,
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
          profileId: signer.profileId,
          pubId: actionContext.frameContext.pubId || "",
          specVersion: "1.0.0",
        });

        if (result.isFailure()) {
          throw new Error("credential expired or not authenticated");
        }

        const searchParams = new URLSearchParams({
          postType:
            actionContext.type === "tx-post"
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
              identityToken: signer.identityToken,
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
        profileId: signer.profileId,
        pubId: actionContext.frameContext.pubId || "",
        specVersion: "1.0.0",
        deadline: Math.floor(Date.now() / 1000) + 86400, // 1 day
      });

      if (
        activeConnectionRef.current[0]?.chainId !== typedData.domain.chainId
      ) {
        await switchChainAsync({ chainId: typedData.domain.chainId });
      }

      const signature = await signTypedDataAsync({
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
          actionContext.type === "tx-post"
            ? "post"
            : actionContext.frameButton.action,
        postUrl: actionContext.target ?? "",
      });

      return {
        body: {
          clientProtocol: "lens@1.0.0",
          untrustedData: {
            ...typedData.value,
            identityToken: signer.identityToken,
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
      activeConnectionRef,
      lensClient.frames,
      lensClient.profile,
      lensSignerRef,
      signTypedDataAsync,
      switchChainAsync,
    ]
  );

  const closeProfileSelector = useCallback(() => {
    setShowProfileSelector(false);
  }, []);

  const isLoadingRef = useFreshRef(isLoading);
  const availableProfilesRef = useFreshRef(availableProfiles);

  return useMemo(() => {
    /**
     * See the explanation in useFarcasterIdentity()
     */
    void lensSigner;
    void isLoading;
    void availableProfiles;

    return {
      specification: "openframes",
      get signer() {
        return lensSignerRef.current;
      },
      get hasSigner() {
        return !!lensSignerRef.current?.accessToken;
      },
      signFrameAction,
      get isLoadingSigner() {
        return isLoadingRef.current;
      },
      onSignerlessFramePress,
      logout,
      showProfileSelector,
      closeProfileSelector,
      get availableProfiles() {
        return availableProfilesRef.current;
      },
      handleSelectProfile,
      withContext(frameContext) {
        return {
          signerState: this,
          frameContext,
        };
      },
    };
  }, [
    availableProfiles,
    availableProfilesRef,
    closeProfileSelector,
    handleSelectProfile,
    isLoading,
    isLoadingRef,
    lensSigner,
    lensSignerRef,
    logout,
    onSignerlessFramePress,
    showProfileSelector,
    signFrameAction,
  ]);
}
