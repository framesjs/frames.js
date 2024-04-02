// eslint-disable-next-line import/no-extraneous-dependencies -- dev dependency
import nock, { enableNetConnect, disableNetConnect } from "nock";
import type { FrameFlattened } from "..";
import { fetchMetadata } from "./fetchMetadata";

describe("fetchMetadata", () => {
  beforeAll(() => {
    disableNetConnect();
  });

  afterAll(() => {
    enableNetConnect();
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

  it("returns empty object on failed response", async () => {
    nock("http://localhost:3000").get("/frames").reply(404);

    await expect(
      fetchMetadata(new URL("/frames", "http://localhost:3000"))
    ).resolves.toEqual({});
  });
});
