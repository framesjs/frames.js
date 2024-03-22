import { getCurrentUrl } from "./getCurrentUrl";

describe("getCurrentUrl", () => {
  it("works with relative url property", () => {
    expect(
      getCurrentUrl({
        url: "/test",
        headers: {
          host: "localhost",
        },
      } as unknown as Request)
    ).toEqual(new URL("http://localhost/test"));
  });

  it("takes value from process.env.VERCEL_URL if available", () => {
    process.env.VERCEL_URL = "test.com";

    expect(
      getCurrentUrl({
        url: "/test",
        headers: {
          host: "localhost",
        },
      } as unknown as Request)
    ).toEqual(new URL("http://test.com/"));
  });

  it("supports proper url in Request object", () => {
    expect(getCurrentUrl(new Request("http://localhost/test"))).toEqual(
      new URL("http://localhost/test")
    );
  });
});
