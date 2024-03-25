import { Message } from "../farcaster";
import nock from "nock";
import { FrameMessageReturnType } from "../getFrameMessage";
import { redirect } from "../core/redirect";
import { FramesContext } from "../core/types";
import { farcasterHubContext } from "./farcasterHubContext";
import { createFrames } from "../core";

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
    const context: FramesContext = {
      request: new Request("https://example.com"),
    } as any;

    const mw = farcasterHubContext();
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

    const mw = farcasterHubContext();
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

    const mw = farcasterHubContext();
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("parses frame message from request body and fetches external hub context and adds it to context", async () => {
    const context: FramesContext = {
      request: sampleFrameActionRequest.clone(),
    } as any;

    const mw = farcasterHubContext();
    const next = jest.fn(() => Promise.resolve(new Response()));

    await mw(context, next);

    const {
      message: calledArg,
    }: {
      message: FrameMessageReturnType<{ fetchHubContext: true }>;
    } = (next.mock.calls[0]! as any)[0];

    expect(calledArg.buttonIndex).toBe(1);
    expect(calledArg.castId).toEqual({
      fid: 456,
      hash: "0x",
    });
    expect(calledArg.connectedAddress).toBe("0x89");
    expect(calledArg.inputText).toBe("hello");
    expect(calledArg.requesterFid).toBe(123);
    expect(calledArg.state).toEqual(JSON.stringify({ test: true }));
    expect(calledArg).toHaveProperty("requesterUserData");
  });

  it("supports custom global typed context", async () => {
    const mw1 = farcasterHubContext();

    const handler = createFrames({
      middleware: [mw1],
    });

    const routeHandler = handler(async (ctx) => {
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
