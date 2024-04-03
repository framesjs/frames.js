import { getCurrentUrl } from "./getCurrentUrl";

describe("getCurrentUrl", () => {
  beforeEach(() => {
    // @ts-expect-error -- this works
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    delete process.env.VERCEL_URL;
    delete process.env.APP_URL;
  });

  it("works with relative url property", () => {
    expect(
      getCurrentUrl({
        url: "/test",
        headers: {
          host: "localhost",
        },
      } as unknown as Request)?.toString()
    ).toEqual("http://localhost/test");
  });

  it("takes value from process.env.VERCEL_URL if available", () => {
    process.env.VERCEL_URL = "test.com";

    expect(
      getCurrentUrl({
        url: "/test",
        headers: {
          host: "localhost",
        },
      } as unknown as Request)?.toString()
    ).toEqual("http://test.com/test");
  });

  it("takes value from process.env.VERCEL_URL and uses https if NODE_ENV=production if available", () => {
    process.env.VERCEL_URL = "test.com";
    // @ts-expect-error -- this works
    process.env.NODE_ENV = "production";

    expect(
      getCurrentUrl({
        url: "/test",
        headers: {
          host: "localhost",
        },
      } as unknown as Request)?.toString()
    ).toEqual("https://test.com/test");
  });

  it("takes value from process.env.APP_URL if available", () => {
    process.env.APP_URL = "app.com";

    expect(
      getCurrentUrl({
        url: "/test",
        headers: {
          host: "localhost",
        },
      } as unknown as Request)?.toString()
    ).toEqual("http://app.com/test");
  });

  it("takes value from process.env.APP_URL and uses https if NODE_ENV=production if available", () => {
    process.env.APP_URL = "test.com";
    // @ts-expect-error -- this works
    process.env.NODE_ENV = "production";

    expect(
      getCurrentUrl({
        url: "/test",
        headers: {
          host: "localhost",
        },
      } as unknown as Request)?.toString()
    ).toEqual("https://test.com/test");
  });

  it("supports proper url in Request object", () => {
    expect(
      getCurrentUrl(new Request("http://localhost/test"))?.toString()
    ).toEqual("http://localhost/test");
  });
});
