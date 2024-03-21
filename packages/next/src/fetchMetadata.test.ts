import nock from "nock";
import { fetchMetadata } from "./fetchMetadata";
import type { FrameFlattened } from "frames.js";

describe("fetchMetadata", () => {
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
      fetchMetadata(new URL("/frames", "http://localhost:3000"))
    ).resolves.toEqual({
      "fc:frame": "vNext",
      "fc:frame:image": "imageUrl",
      "fc:frame:post_url": "",
    });
  });

  it("throws on invalid response", async () => {
    nock("http://localhost:3000").get("/frames").reply(404);

    await expect(
      fetchMetadata(new URL("/frames", "http://localhost:3000"))
    ).rejects.toThrow(
      "Failed to fetch frames metadata from http://localhost:3000/frames. The server returned 404 Not Found response."
    );
  });
});
