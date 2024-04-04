import { getFrameMessage } from "./getFrameMessage";
import { type ActionIndex } from "./types";

describe("getFrameMessage", () => {
  it("should correctly get frame message for a valid message", async () => {
    const sampleBody = {
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

    const message = await getFrameMessage(sampleBody);

    expect(message).toMatchObject({
      isValid: true,
      buttonIndex: 1,
      inputText: "",
      state: JSON.stringify({ counter: 3 }),
    });
  });
});
