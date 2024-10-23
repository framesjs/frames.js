// eslint-disable-next-line import/no-extraneous-dependencies -- this is dev dependency
import nock, { cleanAll } from "nock";
import { DEFAULT_HUB_API_URL } from "./default";
import { getUserDataForFid } from ".";

describe("getUserDataForFid", () => {
  beforeEach(() => {
    cleanAll();
  });

  it("returns latest user data for fid", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/userDataByFid?fid=1214")
      .once()
      .reply(200, {
        messages: [
          {
            data: {
              type: "MESSAGE_TYPE_USER_DATA_ADD",
              fid: 1214,
              timestamp: 69403426,
              network: "FARCASTER_NETWORK_MAINNET",
              userDataBody: {
                type: "USER_DATA_TYPE_PFP",
                value:
                  "https://lh3.googleusercontent.com/-S5cdhOpZtJ_Qzg9iPWELEsRTkIsZ7qGYmVlwEORgFB00WWAtZGefRnS4Bjcz5ah40WVOOWeYfU5pP9Eekikb3cLMW2mZQOMQHlWhg",
              },
            },
            hash: "0x465e44c9d8b4f6189d40b79029168a1dc0b50ea5",
            hashScheme: "HASH_SCHEME_BLAKE3",
            signature:
              "x4J7Lo4FM7wutYYomV7ItFSOlo3Rca4s+BQ5rQK0dvRpIrsCCX7BU5fnkX3UfseXTyh4kJOVYmeEhLeeA27oAw==",
            signatureScheme: "SIGNATURE_SCHEME_ED25519",
            signer:
              "0xf23a5c7b9f067c621a989a585b78daf7b2a9debe9d54325ef95b0878f44204c6",
          },
          {
            data: {
              type: "MESSAGE_TYPE_USER_DATA_ADD",
              fid: 1214,
              timestamp: 69403426,
              network: "FARCASTER_NETWORK_MAINNET",
              userDataBody: {
                type: "USER_DATA_TYPE_USERNAME",
                value: "df",
              },
            },
            hash: "0x93d8ce58ad883db4e1f3c1dfc1cc60a12282b79b",
            hashScheme: "HASH_SCHEME_BLAKE3",
            signature:
              "c+vVPGW/IoVe0chBEyLTPdzxqNtRx4IJp74RPMjxRQsZqs/rwlnGkDjxD2ocYS5FNCLH78dfMDAAoqNETaIZBA==",
            signatureScheme: "SIGNATURE_SCHEME_ED25519",
            signer:
              "0xf23a5c7b9f067c621a989a585b78daf7b2a9debe9d54325ef95b0878f44204c6",
          },
          {
            data: {
              type: "MESSAGE_TYPE_USER_DATA_ADD",
              fid: 1214,
              timestamp: 99133426,
              network: "FARCASTER_NETWORK_MAINNET",
              userDataBody: {
                type: "USER_DATA_TYPE_DISPLAY",
                value: "David Furlong 🎩",
              },
            },
            hash: "0x092dad1a3b31c6ab22ca54607a36c0b2eb09b01f",
            hashScheme: "HASH_SCHEME_BLAKE3",
            signature:
              "c3yG3JfPXOYCskbnlnMwstSn+xUuVs6maZ1T5bgUoDpVEjvJQOnzb4sVz5izIw1D3bmiWl8w5eg0tqkrHY2nBg==",
            signatureScheme: "SIGNATURE_SCHEME_ED25519",
            signer:
              "0xf23a5c7b9f067c621a989a585b78daf7b2a9debe9d54325ef95b0878f44204c6",
          },
          {
            data: {
              type: "MESSAGE_TYPE_USER_DATA_ADD",
              fid: 1214,
              timestamp: 99133426,
              network: "FARCASTER_NETWORK_MAINNET",
              userDataBody: {
                type: "USER_DATA_TYPE_BIO",
                value:
                  "Building open source software via @frames and /mod, to help Farcaster and decentralized social win",
              },
            },
            hash: "0x4f19c63377605ca2d8e8ce7fd51825969472732a",
            hashScheme: "HASH_SCHEME_BLAKE3",
            signature:
              "eTEEM300pXvzvGKgsZQXMBkK2q5YQ2adwfwa/3lBvkocJQBWKXnOad3dcruXcc/kerKPDJgx81dDm3xmLgF7AQ==",
            signatureScheme: "SIGNATURE_SCHEME_ED25519",
            signer:
              "0xf23a5c7b9f067c621a989a585b78daf7b2a9debe9d54325ef95b0878f44204c6",
          },
        ],
      });

    const fid = 1214;

    await expect(getUserDataForFid({ fid })).resolves.toMatchObject({
      displayName: "David Furlong 🎩",
      bio: "Building open source software via @frames and /mod, to help Farcaster and decentralized social win",
      username: "df",
      profileImage:
        "https://lh3.googleusercontent.com/-S5cdhOpZtJ_Qzg9iPWELEsRTkIsZ7qGYmVlwEORgFB00WWAtZGefRnS4Bjcz5ah40WVOOWeYfU5pP9Eekikb3cLMW2mZQOMQHlWhg",
    });
  });

  it("returns null for invalid fid", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/userDataByFid?fid=1000000000000")
      .reply(400, {
        code: 2,
        details:
          'The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received 1_000_000_000_000',
        metadata: { errcode: [null] },
      });

    const fid = 1000000000000;

    await expect(getUserDataForFid({ fid })).resolves.toBe(null);
  });

  it("returns null for not existing fid", async () => {
    nock(DEFAULT_HUB_API_URL).get("/v1/userDataByFid?fid=0").reply(200, {
      messages: [],
    });

    const fid = 0;

    await expect(getUserDataForFid({ fid })).resolves.toBe(null);
  });

  it("returns null if api returns error JSON response", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/userDataByFid?fid=1000000000000")
      .once()
      .reply(400, {
        code: 2,
        details:
          'The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received 1_000_000_000_000',
        metadata: { errcode: [null] },
      });

    const fid = 1000000000000;

    await expect(getUserDataForFid({ fid })).resolves.toBe(null);
  });

  it("fails for non JSON responses", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/userDataByFid?fid=1000000000000")
      .once()
      .reply(504, "Gateway Timeout");

    const fid = 1000000000000;

    await expect(getUserDataForFid({ fid })).rejects.toThrow(
      'Failed to parse response body as JSON because server hub returned response with status "504" and body "Gateway Timeout"'
    );
  });

  it("warns if message could not be parsed", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/userDataByFid?fid=1214")
      .reply(200, {
        messages: [
          {
            data: {
              type: "MESSAGE_TYPE_USER_DATA_ADD",
              fid: 1214,
              timestamp: 69403426,
              network: "FARCASTER_NETWORK_MAINNET",
              userDataBody: {
                type: "USER_DATA_TYPE_SOMETHING_UNKNOWN",
                value:
                  "https://lh3.googleusercontent.com/-S5cdhOpZtJ_Qzg9iPWELEsRTkIsZ7qGYmVlwEORgFB00WWAtZGefRnS4Bjcz5ah40WVOOWeYfU5pP9Eekikb3cLMW2mZQOMQHlWhg",
              },
            },
            hash: "0x465e44c9d8b4f6189d40b79029168a1dc0b50ea5",
            hashScheme: "HASH_SCHEME_BLAKE3",
            signature:
              "x4J7Lo4FM7wutYYomV7ItFSOlo3Rca4s+BQ5rQK0dvRpIrsCCX7BU5fnkX3UfseXTyh4kJOVYmeEhLeeA27oAw==",
            signatureScheme: "SIGNATURE_SCHEME_ED25519",
            signer:
              "0xf23a5c7b9f067c621a989a585b78daf7b2a9debe9d54325ef95b0878f44204c6",
          },
        ],
      });

    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const result = await getUserDataForFid({ fid: 1214 });

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Failed to parse user data message for fid 1214",
      expect.any(Object),
      expect.any(Error)
    );

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Result is null");
    }

    const allValuesUndefined = Object.values(result).every(
      (value) => value === undefined
    );

    expect(allValuesUndefined).toBe(true);
  });
});
