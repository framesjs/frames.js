import type { ActionIndex, FrameActionPayload } from "../types";
import { getLensFrameMessage, type LensFrameRequest } from ".";

describe("getLensMessage", () => {
  const consoleErrorSpy = jest.spyOn(console, "error");

  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  it("should correctly parse invalid frame action", async () => {
    await expect(
      getLensFrameMessage({
        clientProtocol: "lens@1.0.0",
        untrustedData: {
          specVersion: "1.0.0",
          url: "http://localhost:3000/examples/multi-protocol",
          buttonIndex: 1,
          account: "0x0000000000000000000000000000000000000000",
          post: "0x01-0x01",
          app: "0x0000000000000000000000000000000000000000",
          inputText: "",
          state: '{"pageIndex":0}',
          transactionId: "",
          deadline: Math.round((Date.now() + 5000) / 1000),
          identityToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjB4MDFkZjdlIiwiZXZtQWRkcmVzcyI6IjB4OGQyNTY4NzgyOUQ2Yjg1ZDllMDAyMEI4Yzg5ZTNDYTI0ZEUyMGE4OSIsInJvbGUiOiJwcm9maWxlX2lkZW50aXR5IiwiYXV0aG9yaXphdGlvbklkIjoiZTI1M2JiZjUtZDNiOS00ZmVmLWExZjAtMmRkYjgzNGExNzAzIiwiaWF0IjoxNzIxNzQ1NDQ2LCJleHAiOjE3MjE3NDcyNDZ9.tIt8_O1SMP9MThQ9KnihhackfR1zIgoZr8RddU0aF2w",
          unixTimestamp: 1721745455552,
        },
        trustedData: {
          messageBytes:
            "0xd76f924272241da093c910a206b290d4112a889ece33334fb7a2c567a9bf975324ad625f7dec6a0a3d4ce7a7d6ee6d3aba605cd30919680a9adb074e903c90361b",
        },
      })
    ).resolves.toMatchObject({
      transactionId: "",
      buttonIndex: 1,
      inputText: "",
      account: "0x01df7e",
      post: "0x01-0x01",
      isValid: false,
      url: "http://localhost:3000/examples/multi-protocol",
    });
  });

  it("throws an error if the message cannot be decoded", async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- we don't care
    consoleErrorSpy.mockImplementation(() => { });
    const farcasterMessage: FrameActionPayload = {
      untrustedData: {
        fid: 1689,
        url: "https://bc53-102-135-243-163.ngrok-free.app",
        messageHash: "0xd556114225234a6832d0583a2140b1d93f9754e8",
        timestamp: 1712218321000,
        network: 1,
        buttonIndex: 1 as ActionIndex,
        inputText: "",
        state: JSON.stringify({ counter: 3 }),
        castId: {
          fid: 1689,
          hash: "0x0000000000000000000000000000000000000001",
        },
      },
      trustedData: {
        messageBytes:
          "0a68080d10990d18d1f5ff3020018201590a2b68747470733a2f2f626335332d3130322d3133352d3234332d3136332e6e67726f6b2d667265652e61707010011a1908990d121400000000000000000000000000000000000000012a0d7b22636f756e746572223a337d1214d556114225234a6832d0583a2140b1d93f9754e818012240cd2ad34f9a3a960759a0ef4296dab976b222568e30a21803559e54b66730cdb548b8914f85e69d92fbfc05a2bdcd5ee3702a83de399cdb48776d9669e28d0f0d28013220a5f666cac97ae9f09f78cfaaa624ea2a1f03f042aa87c955d0113275e54e9cfe",
      },
    };

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    await expect(
      getLensFrameMessage(
        {
          ...farcasterMessage,
          clientProtocol: "lens@2024-02-09",
        } as unknown as LensFrameRequest,
        {
          environment: "development",
        }
      )
    ).rejects.toThrow("Could not create typed data for Lens, invalid payload.");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
