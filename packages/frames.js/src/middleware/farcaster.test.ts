// eslint-disable-next-line import/no-extraneous-dependencies -- dev dependency
import { disableNetConnect, enableNetConnect } from "nock";
import { Message } from "../farcaster";
import { redirect } from "../core/redirect";
import type { FramesContext } from "../core/types";
import { createFrames } from "../core";
import { farcaster } from "./farcaster";

describe("farcaster middleware", () => {
  let sampleFrameActionRequest: Request;

  beforeAll(() => {
    sampleFrameActionRequest = new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({
        trustedData: {
          messageBytes: Buffer.from(
            Message.encode(
              Message.create({
                data: {
                  fid: 123,
                  frameActionBody: {
                    castId: {
                      fid: 456,
                    },
                    address: Buffer.from([0x789]),
                    buttonIndex: 1,
                    inputText: Buffer.from("hello"),
                    state: Buffer.from(JSON.stringify({ test: true })),
                  },
                },
              })
            ).finish()
          ).toString("hex"),
        },
        untrustedData: {},
      }),
    });
  });

  beforeEach(() => {
    // make sure we don't introduce unexpected network requests
    // TODO: Mock hub/onchain calls
    disableNetConnect();
  });

  afterEach(() => {
    enableNetConnect();
  });

  it("moves to next middleware without parsing if request is not POST request", async () => {
    const context = {
      request: new Request("https://example.com"),
    } as unknown as FramesContext;

    const mw = farcaster();
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("moves to next middleware if request is POST but does not have a valid JSON body", async () => {
    const context = {
      request: new Request("https://example.com", {
        method: "POST",
        body: "invalid json",
      }),
    } as unknown as FramesContext;

    const mw = farcaster();
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("moves to next middleware if request is POST with valid JSON but invalid body shape", async () => {
    const context = {
      request: new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    } as unknown as FramesContext;

    const mw = farcaster();
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("parses frame message from request body and adds it to context", async () => {
    const context = {
      request: sampleFrameActionRequest.clone(),
    } as unknown as FramesContext;

    const mw = farcaster();
    const next = jest.fn(() => Promise.resolve(new Response()));

    disableNetConnect();
    await mw(context, next);
    enableNetConnect();

    expect(next).toHaveBeenCalledWith({
      clientProtocol: { id: "farcaster", version: "vNext" },
      message: {
        buttonIndex: 1,
        castId: {
          fid: 456,
          hash: "0x",
        },
        connectedAddress: "0x89",
        inputText: "hello",
        requesterFid: 123,
        state: JSON.stringify({ test: true }),
        transactionId: undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- safe
        walletAddress: expect.any(Function),
      },
    });
  });

  it("supports custom global typed context", async () => {
    const mw1 = farcaster();

    const handler = createFrames({
      middleware: [mw1],
    });

    const routeHandler = handler((ctx) => {
      return {
        image: `/?fid=${ctx.message?.requesterFid}`,
      };
    });

    const response = await routeHandler(sampleFrameActionRequest.clone());
    expect(response).toBeInstanceOf(Response);

    const responseText = await response.clone().text();
    expect(responseText).toContain("/?fid=123");
  });
});
