import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useConnections,
  useSignTypedData,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { PublicClient, testnet } from "@lens-protocol/client";
import { signFrameAction, createFrameTypedData, fetchAccountManagers } from "@lens-protocol/client/actions";
import type {
  SignerStateActionContext,
  SignerStateInstance,
  SignFrameActionFunction,
} from "../../types";
import type { Storage } from "../types";
import { WebStorage } from "../storage";
import { useFreshRef } from "../../hooks/use-fresh-ref";
import type { LensFrameContext } from "./use-lens-context";
import { fetchAccountsAvailable } from "@lens-protocol/client/actions";

export type LensProfile = {
  account: string;
  username: string;
};

export type LensSigner = {
  account: string;
  accessToken: string;
  identityToken: string;
  username: string;
};

type LensFrameRequest = {
  clientProtocol: string;
  untrustedData: {
    specVersion: string;
    account: string;
    post: string;
    app: string;
    url: string;
    buttonIndex: number;
    unixTimestamp: number;
    deadline?: number;
    inputText?: string;
    state?: string;
    transactionId?: string;
    identityToken: string;
  };
  trustedData: {
    messageBytes: string;
  };
};

export type LensSignerInstance = SignerStateInstance<
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

// Testnet app address (demo)
const TESTNET_APP_ADDRESS = "0xaC19aa2402b3AC3f9Fe471D4783EC68595432465";

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

  const lensClient = PublicClient.create({
    environment: testnet,
    storage: window.localStorage,
  });

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

        const authenticated = await lensClient.login({
          accountOwner: {
            account: profile.account,
            app: TESTNET_APP_ADDRESS,
            owner: walletAddress,
          },
          signMessage: async (message: string) => {
            const signature = await signMessageAsync({
              message: { raw: Buffer.from(message) },
            });
            return signature;
          },
        });

        if (authenticated.isErr()) {
          throw new Error("Authentication failed: " + authenticated.error);
        }

        const sessionClient = authenticated.value;

        const signer: LensSigner = {
          account: profile.account,
          accessToken: sessionClient.accessToken,
          identityToken: sessionClient.idToken,
          username: profile.username,
        };

        await storageRef.current.set<LensSigner>(
          storageKeyRef.current,
          () => signer
        );

        setLensSigner(signer);
      } catch (error) {
        // eslint-disable-next-line no-console -- provide feedback
        console.error("@frames.js/render: Create Lens signer failed", error);
      }
    },
    [addressRef, lensClient, signMessageAsync, storageKeyRef]
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

      const managedProfiles = await fetchAccountsAvailable(lensClient, {
        managedBy: currentAddress,
        includeOwned: true,
      });
      if (managedProfiles.isOk()) {
        const profiles = managedProfiles.value.items.map((p) => ({
          account: p.account.address,
          username: p.account.username
            ? `${p.account.username}`
            : p.account.address,
        }));

        if (!profiles[0]) {
          throw new Error("No Lens profiles managed by connected address");
        }

        if (managedProfiles.value.items.length > 1) {
          setAvailableProfiles(profiles);
          setShowProfileSelector(true);
        } else {
          await handleSelectProfile(profiles[0]);
        }
      } else {
        console.error(
          "@frames.js/render: Create Lens signer failed",
          managedProfiles.error
        );
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
    lensSignerRef,
    lensClient,
  ]);

  const activeConnectionRef = useFreshRef(activeConnection);

  const signLensFrameAction: SignFrameActionFunction<
    SignerStateActionContext<LensSigner, LensFrameContext>,
    LensFrameRequest
  > = useCallback(
    async (actionContext) => {
      const signer = lensSignerRef.current;

      if (!signer) {
        throw new Error("No lens signer active");
      }

      const profileManagers = await fetchAccountManagers(lensClient);
      const lensManagerEnabled = profileManagers.items.some(
        (manager) => manager.isLensManager
      );

      if (lensManagerEnabled) {
        const result = await signFrameAction(lensClient, {
          url: actionContext.url,
          inputText: actionContext.inputText || "",
          state: actionContext.state || "",
          buttonIndex: actionContext.buttonIndex,
          transactionId:
            actionContext.type === "tx-post" ? actionContext.transactionId : "",
          account: signer.account,
          app: TESTNET_APP_ADDRESS,
          post: actionContext.frameContext.pubId || "",
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

      const typedData = await createFrameTypedData(lensClient, {
        url: actionContext.url,
        inputText: actionContext.inputText || "",
        state: actionContext.state || "",
        buttonIndex: actionContext.buttonIndex,
        transactionId:
          actionContext.type === "tx-post" ? actionContext.transactionId : "",
        account: signer.account,
        post: actionContext.frameContext.pubId || "",
        app: TESTNET_APP_ADDRESS,
        specVersion: "1.1.0",
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
          clientProtocol: "lens@1.1.0",
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
      signFrameAction: signLensFrameAction,
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
      withContext(frameContext, overrides) {
        return {
          signerState: {
            ...this,
            ...overrides,
          },
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
