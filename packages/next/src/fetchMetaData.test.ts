import nock from "nock";
import { fetchMetaData } from "./fetchMetaData";
import type { FrameFlattened } from "frames.js";

describe("fetchMetaData", () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  it("returns metadata", async () => {
    nock("http://localhost:3000")
      .get("/frames")
      .reply(200, {
        "fc:frame": "vNext",
        "fc:frame:image": "imageUrl",
        "fc:frame:post_url": "",
      } satisfies FrameFlattened);

    await expect(
      fetchMetaData(new URL("/frames", "http://localhost:3000"))
    ).resolves.toEqual({
      "fc:frame": "vNext",
      "fc:frame:image": "imageUrl",
      "fc:frame:post_url": "",
    });
  });

  it("throws on invalid response", async () => {
    nock("http://localhost:3000").get("/frames").reply(404);

    await expect(
      fetchMetaData(new URL("/frames", "http://localhost:3000"))
    ).rejects.toThrow(
      "Failed to fetch frames metadata from http://localhost:3000/frames. The server returned 404 Not Found response."
    );
  });
});
