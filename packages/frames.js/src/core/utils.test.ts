import {
  generatePostButtonTargetURL,
  parseButtonInformationFromTargetURL,
} from "./utils";

describe("generatePostButtonTargetURL", () => {
  it("generates an URL for post button without target and without state", () => {
    const expected = new URL("/test", "http://test.com");
    expected.searchParams.set("__bi", "1:p");

    expect(
      generatePostButtonTargetURL({
        target: undefined,
        basePath: "/",
        buttonAction: "post",
        buttonIndex: 1,
        currentURL: new URL("http://test.com/test"),
      })
    ).toBe(expected.toString());
  });

  it("generates an URL for post button without target and with state", () => {
    const expected = new URL("/", "http://test.com");
    expected.searchParams.set("test", "test");
    expected.searchParams.set("__bi", "1:p");

    expect(
      generatePostButtonTargetURL({
        basePath: "/",
        buttonAction: "post",
        buttonIndex: 1,
        currentURL: new URL("http://test.com/test"),
        target: { query: { test: "test" } },
      })
    ).toBe(expected.toString());
  });

  it("generates an URL for post button with target and without state", () => {
    const expected = new URL("/test", "http://test.com");
    expected.searchParams.set("__bi", "1:p");

    expect(
      generatePostButtonTargetURL({
        target: "/test",
        basePath: "/",
        buttonAction: "post",
        buttonIndex: 1,
        currentURL: new URL("http://test.com"),
      })
    ).toBe(expected.toString());
  });

  it("generates an URL for post button with target and with state", () => {
    const expected = new URL("/test", "http://test.com");
    expected.searchParams.set("test", "test");
    expected.searchParams.set("__bi", "1:p");

    expect(
      generatePostButtonTargetURL({
        basePath: "/",
        buttonAction: "post",
        buttonIndex: 1,
        currentURL: new URL("http://test.com"),
        target: { query: { test: "test" }, pathname: "/test" },
      })
    ).toBe(expected.toString());
  });

  it.each(["/", "/test", "/test/test"])(
    "resolves target relatively to basePath and current path %s",
    (currentPath) => {
      const expected = new URL("/prefixed/test/my-target", "http://test.com");
      expected.searchParams.set("__bi", "1:p");

      expect(
        generatePostButtonTargetURL({
          target: "/my-target",
          basePath: "/prefixed/test",
          buttonAction: "post",
          buttonIndex: 1,
          currentURL: new URL(currentPath, "http://test.com/"),
        })
      ).toBe(expected.toString());
    }
  );

  it("also supports post_redirect button", () => {
    const expected = new URL("/test", "http://test.com");
    expected.searchParams.set("__bi", "1:pr");

    expect(
      generatePostButtonTargetURL({
        target: undefined,
        basePath: "/",
        buttonAction: "post_redirect",
        buttonIndex: 1,
        currentURL: new URL("http://test.com/test"),
      })
    ).toBe(expected.toString());
  });
});

describe("parseButtonInformationFromTargetURL", () => {
  it("returns undefined if query param for button information is not present", () => {
    const url = new URL("http://test.com");

    expect(parseButtonInformationFromTargetURL(url)).toBeUndefined();
  });

  it("returns undefined if query param for button information is not in valid format", () => {
    const url = new URL("http://test.com");
    url.searchParams.set("__bi", "1");

    expect(parseButtonInformationFromTargetURL(url)).toBeUndefined();
  });

  it("returns undefined if button index is not valid", () => {
    const url = new URL("http://test.com");
    url.searchParams.set("__bi", "5:p");

    expect(parseButtonInformationFromTargetURL(url)).toBeUndefined();
  });

  it("returns undefined if button action is not valid", () => {
    const url = new URL("http://test.com");
    url.searchParams.set("__bi", "1:unknown");

    expect(parseButtonInformationFromTargetURL(url)).toBeUndefined();
  });

  it("parses button information from URL for post button", () => {
    const url = new URL("http://test.com");
    url.searchParams.set("__bi", "1:p");

    expect(parseButtonInformationFromTargetURL(url)).toEqual({
      action: "post",
      index: 1,
    });
  });

  it("parses button information from URL for post_redirect button", () => {
    const url = new URL("http://test.com");
    url.searchParams.set("__bi", "1:pr");

    expect(parseButtonInformationFromTargetURL(url)).toEqual({
      action: "post_redirect",
      index: 1,
    });
  });

  it("parses state if button information is valid and state is present and is also valid", () => {
    const url = new URL("http://test.com");
    url.searchParams.set("__bi", "1:p");
    url.searchParams.set("test", "test");

    expect(parseButtonInformationFromTargetURL(url)).toEqual({
      action: "post",
      index: 1,
    });
  });
});
