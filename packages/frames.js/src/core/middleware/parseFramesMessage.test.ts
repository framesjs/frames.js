import nock from "nock";
import { redirect } from "../redirect";
import { FramesContext } from "../types";
import { parseFramesMessage } from "./parseFramesMessage";
import { Message } from "@farcaster/core";

describe("parseFramesMessage middleware", () => {
  beforeEach(() => {
    // make sure we don't introduce unexpected network requests
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.enableNetConnect();
  });

  it("moves to next middleware without parsing if request is not POST request", async () => {
    const context: FramesContext = {
      request: new Request("https://example.com"),
    } as any;

    const mw = parseFramesMessage();
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

    const mw = parseFramesMessage();
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

    const mw = parseFramesMessage();
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("parses frame message from request body and adds it to context", async () => {
    const context: FramesContext = {
      request: new Request("https://example.com", {
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
      }),
    } as any;

    const mw = parseFramesMessage();
    const next = jest.fn(() => Promise.resolve(new Response()));

    await mw(context, next);

    expect(next).toHaveBeenCalledWith({
      message: {
        buttonIndex: 1,
        castId: {
          fid: 456,
          hash: "0x",
        },
        connectedAddress: "0x89",
        inputText: "hello",
        requesterFid: 123,
        state: { test: true },
      },
    });
  });
});
