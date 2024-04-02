import { Message } from "../farcaster";
import { redirect } from "../core/redirect";
import type { FramesContext } from "../core/types";
import { createFrames } from "../core";
import type { UserDataReturnType } from "..";
import { farcasterHubContext } from "./farcasterHubContext";

describe("farcasterHubContext middleware", () => {
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
    // nock.disableNetConnect();
  });

  afterEach(() => {
    // nock.enableNetConnect();
  });

  it("moves to next middleware without parsing if request is not POST request", async () => {
    const context = {
      request: new Request("https://example.com"),
    } as unknown as FramesContext;

    const mw = farcasterHubContext();
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

    const mw = farcasterHubContext();
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

    const mw = farcasterHubContext();
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("parses frame message from request body and fetches external hub context and adds it to context", async () => {
    const context = {
      request: sampleFrameActionRequest.clone(),
    } as unknown as FramesContext;

    const mw = farcasterHubContext();
    const next = jest.fn(() => Promise.resolve(new Response()));

    await mw(context, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
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
          requestedUserData: expect.anything() as UserDataReturnType,
        },
      })
    );
  });

  it("supports custom global typed context", async () => {
    const mw1 = farcasterHubContext();

    const handler = createFrames({
      middleware: [mw1],
    });

    const routeHandler = handler((ctx) => {
      return {
        image: `/?username=${ctx.message?.requesterUserData?.username}`,
      };
    });

    const response = await routeHandler(sampleFrameActionRequest.clone());
    expect(response).toBeInstanceOf(Response);

    const responseText = await response.clone().text();
    expect(responseText).not.toContain("/?username=undefined");
  });

  // TODO: Tests for custom hub options
});
