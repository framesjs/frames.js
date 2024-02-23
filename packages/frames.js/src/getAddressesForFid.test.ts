import nock from "nock";
import { getAddressesForFid } from "./getAddressesForFid";
import { DEFAULT_HUB_API_URL } from "./default";

describe("getAddressesForFid", () => {
  afterEach(() => {
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
              type: "MESSAGE_TYPE_VERIFICATION_ADD_ETH_ADDRESS",
              fid: 1689,
              timestamp: 76062607,
              network: "FARCASTER_NETWORK_MAINNET",
              verificationAddAddressBody: {
                address: "0x8d25687829d6b85d9e0020b8c89e3ca24de20a89",
                claimSignature:
                  "mv4NA1rr3/ktD2h+FFOhT1biC8iWQfRzg4ekqJDYa986ZtGrpfdrAw9boHmb10KecVdMBHt3cVYWwGihgouzYxs=",
                blockHash:
                  "0xa4233cb5b9127770c13d5e0d1ea3d1b3e8a4552ea29c956a72d7a1139c76b4c0",
                verificationType: 0,
                chainId: 0,
                protocol: "PROTOCOL_ETHEREUM",
                ethSignature:
                  "mv4NA1rr3/ktD2h+FFOhT1biC8iWQfRzg4ekqJDYa986ZtGrpfdrAw9boHmb10KecVdMBHt3cVYWwGihgouzYxs=",
              },
              verificationAddEthAddressBody: {
                address: "0x8d25687829d6b85d9e0020b8c89e3ca24de20a89",
                claimSignature:
                  "mv4NA1rr3/ktD2h+FFOhT1biC8iWQfRzg4ekqJDYa986ZtGrpfdrAw9boHmb10KecVdMBHt3cVYWwGihgouzYxs=",
                blockHash:
                  "0xa4233cb5b9127770c13d5e0d1ea3d1b3e8a4552ea29c956a72d7a1139c76b4c0",
                verificationType: 0,
                chainId: 0,
                protocol: "PROTOCOL_ETHEREUM",
                ethSignature:
                  "mv4NA1rr3/ktD2h+FFOhT1biC8iWQfRzg4ekqJDYa986ZtGrpfdrAw9boHmb10KecVdMBHt3cVYWwGihgouzYxs=",
              },
            },
            hash: "0x350b19e5d0f4756303a7e342f9aceb124f0c1a44",
            hashScheme: "HASH_SCHEME_BLAKE3",
            signature:
              "cS01Dr8F+cVb1sYaM8O5rUOhp3QWc36qSXZnZzy1UTNGGxRNS+81iS0CkMJljQNMfHmGDQS6EfWMAIXmOqWuDg==",
            signatureScheme: "SIGNATURE_SCHEME_ED25519",
            signer:
              "0xa5f666cac97ae9f09f78cfaaa624ea2a1f03f042aa87c955d0113275e54e9cfe",
          },
        ],
      });

    const fid = 1689;

    await expect(getAddressesForFid({ fid })).resolves.toMatchObject([
      expect.objectContaining({
        address: "0x8d25687829d6b85d9e0020b8c89e3ca24de20a89",
        type: "verified",
      }),
      expect.objectContaining({
        type: "custody",
      }),
    ]);
  });

  it("falls back to custody address if no addresses are connect to fid", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/verificationsByFid?fid=1")
      .once()
      .reply(200, {
        messages: [],
      });

    const fid = 1;

    await expect(getAddressesForFid({ fid })).resolves.toMatchObject([
      expect.objectContaining({ type: "custody" }),
    ]);
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

    await expect(getAddressesForFid({ fid })).resolves.toMatchObject([
      expect.objectContaining({ type: "custody" }),
    ]);
  });

  it("fails for non JSON responses", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/verificationsByFid?fid=1")
      .once()
      .reply(504, "Gateway Timeout");

    const fid = 1;

    await expect(getAddressesForFid({ fid })).rejects.toThrow(
      'Failed to parse response body as JSON because server hub returned response with status "504" and body "Gateway Timeout"'
    );
  });
});
