import { redirect } from "../core/redirect";
import type { FramesContext } from "../core/types";
import { neynarValidate } from "./neynarValidate";
import type { ValidateFrameActionResponse } from "./types.message";

describe("neynarValidate middleware", () => {
  let sampleFrameActionRequest: Request;

  beforeAll(() => {
    sampleFrameActionRequest = new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({
        trustedData: {
          messageBytes:
            "0a49080d1085940118f6a6a32e20018201390a1a86db69b3ffdf6ab8acb6872b69ccbe7eb6a67af7ab71e95aa69f10021a1908ef011214237025b322fd03a9ddc7ec6c078fb9c56d1a72111214e3d88aeb2d0af356024e0c693f31c11b42c76b721801224043cb2f3fcbfb5dafce110e934b9369267cf3d1aef06f51ce653dc01700fc7b778522eb7873fd60dda4611376200076caf26d40a736d3919ce14e78a684e4d30b280132203a66717c82d728beb3511b05975c6603275c7f6a0600370bf637b9ecd2bd231e",
        },
        untrustedData: {},
      }),
    });
  });

  it("moves to next middleware without parsing if request is not POST request", async () => {
    const context = {
      request: new Request("https://example.com"),
    } as unknown as FramesContext;

    const mw = neynarValidate();
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

    const mw = neynarValidate();
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

    const mw = neynarValidate();
    const response = redirect("http://test.com");
    const next = jest.fn(() => Promise.resolve(response));

    await expect(mw(context, next)).resolves.toMatchObject(response);
    expect(next).toHaveBeenCalledWith();
  });

  it("parses frame message from request body and fetches external hub context and adds it to context", async () => {
    const context = {
      request: sampleFrameActionRequest.clone(),
    } as unknown as FramesContext;

    const mw = neynarValidate();
    const next = jest.fn(() => Promise.resolve(new Response()));

    await mw(context, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        clientProtocol: { id: "farcaster", version: "vNext" },
        message: {
          action: {
            cast: expect.anything() as ValidateFrameActionResponse["action"]["cast"],
            interactor:
              expect.anything() as ValidateFrameActionResponse["action"]["interactor"],
            object: "validated_frame_action",
            state: { serialized: "" },
            tapped_button: { index: 2 },
            timestamp: "2024-01-29T05:36:54.000Z",
            url: "��i���j����+i̾~��z��q�Z��",
          },
          signature_temporary_object:
            expect.anything() as ValidateFrameActionResponse["signature_temporary_object"],
          valid: true,
        },
      })
    );
  });

  // TODO: Tests for custom hub options
});
