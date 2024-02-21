import nock from "nock";
import { getAddressForFid } from ".";
import { DEFAULT_HUB_API_URL } from "./default";
import { MessageType } from "./farcaster";

describe("getAddressForFid", () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it("returns address for fid with connected address", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/verificationsByFid?fid=1689")
      .once()
      .reply(200, {
        messages: [
          {
            data: {
              type: MessageType.VERIFICATION_ADD_ETH_ADDRESS,
              verificationAddEthAddressBody: {
                address: Buffer.from(
                  "0x8d25687829d6b85d9e0020b8c89e3ca24de20a89",
                  "hex"
                ),
              },
            },
          },
        ],
      });

    const fid = 1689;

    await expect(getAddressForFid({ fid })).resolves.not.toBe(null);
  });

  it("returns null for fid without connected address and disabled fallback", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/verificationsByFid?fid=1")
      .once()
      .reply(200, {
        messages: [],
      });

    const fid = 1;

    await expect(
      getAddressForFid({ fid, options: { fallbackToCustodyAddress: false } })
    ).resolves.toBe(null);
  });

  it("falls back to custody address for fid without connected address", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/verificationsByFid?fid=1")
      .once()
      .reply(200, {
        messages: [],
      });

    const fid = 1;

    await expect(
      getAddressForFid({
        fid,
      })
    ).resolves.not.toBe(null);
  });

  it("falls back to custody address if api returns error JSON response", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/verificationsByFid?fid=1")
      .once()
      .reply(400, {
        code: 2,
        details:
          'The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received 1_000_000_000_000',
        metadata: { errcode: [null] },
      });

    const fid = 1;

    await expect(
      getAddressForFid({
        fid,
      })
    ).resolves.not.toBe(null);
  });

  it("returns null if api returns error JSON response and fallback is disabled", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/verificationsByFid?fid=1")
      .once()
      .reply(400, {
        code: 2,
        details:
          'The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received 1_000_000_000_000',
        metadata: { errcode: [null] },
      });

    const fid = 1;

    await expect(
      getAddressForFid({
        fid,
        options: { fallbackToCustodyAddress: false },
      })
    ).resolves.toBe(null);
  });

  it("fails for non JSON responses", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/verificationsByFid?fid=1")
      .once()
      .reply(504, "Gateway Timeout");

    const fid = 1;

    await expect(getAddressForFid({ fid })).rejects.toThrow(
      'Failed to parse response body as JSON because server hub returned response with status "504" and body "Gateway Timeout"'
    );
  });
});
