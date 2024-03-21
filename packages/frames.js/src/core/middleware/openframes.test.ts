import { FramesClient } from "@xmtp/frames-client";
import { XmtpValidator } from "@xmtp/frames-validator";
import { Client, Signer } from "@xmtp/xmtp-js";
import { WalletClient, createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "../../xmtp";
import { redirect } from "../redirect";
import { FrameDefinition, FramesContext } from "../types";
import { isFrameDefinition } from "../utils";
import { openframes } from "./openframes";
import { renderResponse } from "./renderResponse";

export function convertWalletClientToSigner(
  walletClient: WalletClient
): Signer {
  const { account } = walletClient;
  if (!account || !account.address) {
    throw new Error("WalletClient is not configured");
  }

  return {
    getAddress: async () => account.address,
    signMessage: async (message: string | Uint8Array) =>
      walletClient.signMessage({
        message: typeof message === "string" ? message : { raw: message },
        account,
      }),
  };
}

describe("openframes middleware", () => {
  let xmtpClient: Client;
  let framesClient: FramesClient;
  let xmtpValidator: XmtpValidator;

  let clientProtocolHandlers: any;

  beforeAll(async () => {
    // make sure we don't introduce unexpected network requests
    // nock.disableNetConnect();

    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(),
    });

    const signer = convertWalletClientToSigner(walletClient);

    xmtpClient = await Client.create(signer, { env: "dev" });
    framesClient = new FramesClient(xmtpClient);

    xmtpValidator = new XmtpValidator();

    clientProtocolHandlers = {
      [xmtpValidator.minProtocolVersion()]: {
        isValidPayload: (body: JSON) => isXmtpFrameActionPayload(body),
        getFrameMessage: async (body: JSON) => {
          if (!isXmtpFrameActionPayload(body)) {
            return undefined;
          }
          const result = await getXmtpFrameMessage(body);

          let state: any;
          try {
            state = JSON.parse(result.state);
          } catch (error) {
            console.error("openframes: Could not parse state");
          }

          return { ...result, state };
        },
      },
    };
  });

  afterEach(() => {
    // nock.enableNetConnect();
  });

  it("adds of:accepts tags to frame definition", async () => {
    const frameUrl = "https://example.com";
    const buttonIndex = 1;

    const signedPayload = await framesClient.signFrameAction({
      frameUrl,
      buttonIndex,
      conversationTopic: "foo",
      participantAccountAddresses: ["amal", "bola"],
      inputText: "hello",
      state: JSON.stringify({ test: true }),
    });

    const context: FramesContext = {
      request: new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify(signedPayload),
      }),
    } as any;

    const mw = openframes({
      clientProtocolHandlers: {
        "other@vNext": {
          isValidPayload: () => false,
          getFrameMessage: async () => {
            return {};
          },
        },
      },
    });
    // eslint-disable-next-line no-unused-vars
    const next = jest.fn((...args) =>
      Promise.resolve({
        image: "/test.png",
      } as FrameDefinition)
    );

    const nextResult = await mw(context, next);

    expect(isFrameDefinition(nextResult)).toBe(true);
    expect((nextResult as FrameDefinition).accepts).toContainEqual({
      id: "other",
      version: "vNext",
    });

    const responseMw = renderResponse();
    const responseNext = jest.fn((...args) => Promise.resolve(nextResult));
    const response = (await responseMw(context, responseNext)) as Response;
    const responseText = await response.text();
    expect(responseText).toContain(
      `<meta name="of:accepts:other" content="vNext"/>`
    );
  });

  it("moves to next middleware without parsing if request is not POST request", async () => {
    const context: FramesContext = {
      request: new Request("https://example.com"),
    } as any;

    const mw = openframes({
      clientProtocolHandlers,
    });
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("moves to next middleware if request is POST but does not have a valid JSON body", async () => {
    const context: FramesContext = {
      request: new Request("https://example.com", {
        method: "POST",
        body: "invalid json",
      }),
    } as any;

    const mw = openframes({
      clientProtocolHandlers,
    });
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("moves to next middleware if request is POST with valid JSON but invalid body shape", async () => {
    const context: FramesContext = {
      request: new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    } as any;

    const mw = openframes({
      clientProtocolHandlers,
    });
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("parses frame message from request body and adds it to context", async () => {
    const frameUrl = "https://example.com";
    const buttonIndex = 1;

    const signedPayload = await framesClient.signFrameAction({
      frameUrl,
      buttonIndex,
      conversationTopic: "foo",
      participantAccountAddresses: ["amal", "bola"],
      inputText: "hello",
      state: JSON.stringify({ test: true }),
    });

    const context: FramesContext = {
      request: new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify(signedPayload),
      }),
    } as any;

    const mw = openframes({
      clientProtocolHandlers,
    });
    // eslint-disable-next-line no-unused-vars
    const next = jest.fn((...args) => Promise.resolve(new Response()));

    await mw(context, next);

    const calledArg: { clientProtocol: string; message: any } =
      next.mock.calls[0]![0];

    expect(calledArg.message.buttonIndex).toBe(buttonIndex);
    expect(calledArg.message.inputText).toBe("hello");
    expect(calledArg.message.state).toMatchObject({ test: true });
    expect(calledArg.clientProtocol).toBe(xmtpValidator.minProtocolVersion());
  });
});
