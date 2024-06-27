import { createWalletClient, http, type WalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { FRAMES_META_TAGS_HEADER, createFrames } from "../core";
import type { JsonValue } from "../core/types";
import { openframes } from "../middleware";
import {
  createEthereumFrameRequest,
  createSignedPublicKeyBundle,
  getEthereumFrameMessage,
  isEthereumFrameActionPayload,
  type SignedPublicKeyBundle,
} from ".";

describe("ethereum open frames middleware", () => {
  let walletClient: WalletClient;
  let proxyWalletClient: WalletClient;
  let appWalletClient: WalletClient;
  let signedPublicKeyBundle: SignedPublicKeyBundle;

  const mw = openframes({
    clientProtocol: {
      id: "eth",
      version: "v1",
    },
    handler: {
      isValidPayload: (body: JsonValue) => isEthereumFrameActionPayload(body),
      getFrameMessage: async (body: JsonValue) => {
        if (!isEthereumFrameActionPayload(body)) {
          return undefined;
        }
        const result = await getEthereumFrameMessage(body);

        let state: (typeof result)["state"] | undefined;

        if (result.state) {
          try {
            state = JSON.parse(result.state) as typeof state;
          } catch (error) {
            // eslint-disable-next-line no-console -- we are expecting invalid state
            console.error("openframes: Could not parse state");
          }
        }

        return { ...result, state };
      },
    },
  });

  beforeAll(async () => {
    const walletAccount = privateKeyToAccount(generatePrivateKey());
    walletClient = createWalletClient({
      account: walletAccount,
      chain: mainnet,
      transport: http(),
    });

    const appAccount = privateKeyToAccount(generatePrivateKey());
    appWalletClient = createWalletClient({
      account: appAccount,
      chain: mainnet,
      transport: http(),
    });

    const publicKeyBundleResult = await createSignedPublicKeyBundle(
      walletClient,
      appWalletClient,
      {
        type: "1",
        appData: {
          name: "Example App",
          description: "This is an example app",
          iconUrl: "https://example.com/icon.png",
          url: "https://example.com",
        },
      }
    );
    proxyWalletClient = createWalletClient({
      account: privateKeyToAccount(publicKeyBundleResult.privateKey),
      chain: mainnet,
      transport: http(),
    });
    signedPublicKeyBundle = publicKeyBundleResult.signedPublicKeyBundle;
  });

  it("creates a frame request body", async () => {
    const payload = await createEthereumFrameRequest(
      {
        buttonIndex: 1,
        unixTimestamp: Date.now(),
        url: "https://example.com",
      },
      proxyWalletClient,
      signedPublicKeyBundle
    );

    expect(payload).toEqual(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- we are testing type
        untrustedData: expect.objectContaining({
          buttonIndex: 1,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- we are testing type
          unixTimestamp: expect.any(Number),
          url: "https://example.com",
          signedPublicKeyBundle,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- we are testing type
          signature: expect.any(String),
        }),
        clientProtocol: "eth@v1",
      })
    );
  });

  it("is handled by openframes middleware", async () => {
    const frames = createFrames({
      basePath: "/",
      middleware: [mw],
    });

    const payload = await createEthereumFrameRequest(
      {
        buttonIndex: 1,
        unixTimestamp: Date.now(),
        url: "https://example.com",
      },
      proxyWalletClient,
      signedPublicKeyBundle
    );

    const request = new Request("https://example.com", {
      body: JSON.stringify(payload),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: FRAMES_META_TAGS_HEADER,
      },
    });

    const handler = frames(async (ctx) => {
      expect(ctx.message?.requesterWalletAddress).toEqual(
        walletClient.account?.address
      );

      return {
        image: `https://example.com/image.png`,
      };
    });

    await handler(request);
  });

  it("detects invalid message", async () => {
    const frames = createFrames({
      basePath: "/",
      middleware: [mw],
    });

    const otherAccount = privateKeyToAccount(generatePrivateKey());
    const otherWalletClient = createWalletClient({
      account: otherAccount,
      chain: mainnet,
      transport: http(),
    });

    const payload = await createEthereumFrameRequest(
      {
        buttonIndex: 1,
        unixTimestamp: Date.now(),
        url: "https://example.com",
      },
      otherWalletClient,
      signedPublicKeyBundle
    );

    const request = new Request("https://example.com", {
      body: JSON.stringify(payload),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: FRAMES_META_TAGS_HEADER,
      },
    });

    const handler = frames(async (ctx) => {
      expect(ctx.message?.isValid).toBe(false);

      return {
        image: `https://example.com/image.png`,
      };
    });

    await handler(request);
  });
});
