import { getFrameFlattened } from ".";

describe("getFrameFlattened", () => {
  it("handles of:accepts correctly", () => {
    expect(
      getFrameFlattened({
        image: "image",
        postUrl: "postUrl",
        version: "vNext",
        accepts: [{ id: "id", version: "version" }],
      })
    ).toEqual({});
  });
});
