import nock from "nock";
import { getUserDataForFid } from ".";
import { DEFAULT_HUB_API_URL } from "./default";
import { FarcasterNetwork, MessageType, UserDataType } from "./farcaster";

describe("getUserDataForFid", () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it("returns latest user data for fid", async () => {
    nock(DEFAULT_HUB_API_URL)
      .get("/v1/userDataByFid?fid=1214")
      .once()
      .reply(200, {
        messages: [
          {
            data: {
              type: MessageType.USER_DATA_ADD,
              fid: 6833,
              timestamp: 83433831,
              network: FarcasterNetwork.MAINNET,
              userDataBody: {
                type: UserDataType.PFP,
                value:
                  "https://lh3.googleusercontent.com/-S5cdhOpZtJ_Qzg9iPWELEsRTkIsZ7qGYmVlwEORgFB00WWAtZGefRnS4Bjcz5ah40WVOOWeYfU5pP9Eekikb3cLMW2mZQOMQHlWhg",
              },
            },
          },
          {
            data: {
              type: MessageType.USER_DATA_ADD,
              fid: 6833,
              timestamp: 83433831,
              network: FarcasterNetwork.MAINNET,
              userDataBody: {
                type: UserDataType.BIO,
                value:
                  "Building open source software via @frames and /mod, to help Farcaster and decentralized social win",
              },
            },
          },
          {
            data: {
              type: MessageType.USER_DATA_ADD,
              fid: 6833,
              timestamp: 83433831,
              network: FarcasterNetwork.MAINNET,
              userDataBody: {
                type: UserDataType.DISPLAY,
                value: "David Furlong 🎩",
              },
            },
          },
        ],
      });

    const fid = 1214;

    await expect(getUserDataForFid({ fid })).resolves.not.toBe(null);
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
});
