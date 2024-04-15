// eslint-disable-next-line import/no-extraneous-dependencies -- this is dev dependency of root package
import nock, { disableNetConnect, enableNetConnect } from "nock";
import type { FrameFlattened } from "..";
import { fetchMetadata } from "./fetchMetadata";

describe("fetchMetaData", () => {
  beforeAll(() => {
    disableNetConnect();
  });

  afterAll(() => {
    enableNetConnect();
  });

  it("returns correct metadata from flattened frame", async () => {
    nock("http://localhost:3000")
      .get("/frames")
      .reply(200, {
        "og:image": "imageUrl",
        "fc:frame": "vNext",
        "fc:frame:image": "imageUrl",
        "fc:frame:post_url": "",
      } satisfies FrameFlattened);

    const metadata = await fetchMetadata(
      new URL("/frames", "http://localhost:3000")
    );

    expect(metadata).toEqual([
      { name: "og:image", content: "imageUrl" },
      { name: "fc:frame", content: "vNext" },
      { name: "fc:frame:image", content: "imageUrl" },
      { name: "fc:frame:post_url", content: "" },
    ]);
  });

  it("throws an error when response is not ok", async () => {
    nock("http://localhost:3000").get("/frames").reply(404);

    await expect(
      fetchMetadata(new URL("/frames", "http://localhost:3000"))
    ).rejects.toThrow(
      "Failed to fetch frames metadata from http://localhost:3000/frames. The server returned 404 Not Found response."
    );
  });
});
