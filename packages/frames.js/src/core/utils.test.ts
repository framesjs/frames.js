import {
  generateButtonTargetURL,
  parseButtonInformationFromTargetURL,
  resolveBaseUrl,
  generateTargetURL,
  joinPaths,
  parseSearchParams,
  isFrameRedirect,
  isFrameDefinition,
} from "./utils";

describe("generateTargetURL", () => {
  it("generates a correct URL with baseUrl if pathname is missing", () => {
    const baseUrl = new URL("http://test.com/frames");
    const target = { query: { test: "test" } };

    expect(generateTargetURL({ baseUrl, target }).toString()).toBe(
      "http://test.com/frames?test=test"
    );
  });

  it("generates a correct URL if pathname is set", () => {
    const baseUrl = new URL("http://test.com/frames");
    const target = { pathname: "/test", query: { test: "test" } };

    expect(generateTargetURL({ baseUrl, target }).toString()).toBe(
      "http://test.com/frames/test?test=test"
    );
  });

  it("generates a correct URL if target is an absolute URL", () => {
    const baseUrl = new URL("http://test.com");
    const target = "http://test.com/test";

    expect(generateTargetURL({ baseUrl, target }).toString()).toBe(
      "http://test.com/test"
    );
  });

  it("generates a correct URL if target is an absolute URL with query params", () => {
    const baseUrl = new URL("http://test.com");
    const target = "http://test.com/test?test=test";

    expect(generateTargetURL({ baseUrl, target }).toString()).toBe(
      "http://test.com/test?test=test"
    );
  });

  it("generates a correct URL if target is an URL object with every compulsory property", () => {
    // If the user passing in a URL object with all props required to 
    // construct a full URL, that means they want to go straight to 
    // there without modification.
    const baseUrl = new URL("http://test.com");
    const target = new URL("http://another.com/test");

    expect(generateTargetURL({ baseUrl, target }).toString()).toBe(
      target.toString()
    );
  });
});

describe("resolveBaseUrl", () => {
  it("uses URL from request if no baseUrl is provided", () => {
    const request = new Request("http://test.com");
    const basePath = "/";

    expect(resolveBaseUrl(request, undefined, basePath).toString()).toBe(
      "http://test.com/"
    );
  });

  it('uses baseUrl if it is provided and basePath is "/"', () => {
    const request = new Request("http://test.com");
    const basePath = "/";

    expect(
      resolveBaseUrl(
        request,
        new URL("http://override.com"),
        basePath
      ).toString()
    ).toBe("http://override.com/");

    expect(
      resolveBaseUrl(
        request,
        new URL("http://override.com/test"),
        basePath
      ).toString()
    ).toBe("http://override.com/test");
  });

  it("resolves basePath relatively to baseUrl", () => {
    const request = new Request("http://test.com");
    const basePath = "/test";

    expect(
      resolveBaseUrl(
        request,
        new URL("http://override.com"),
        basePath
      ).toString()
    ).toBe("http://override.com/test");
  });

  it("overrides path on request URL with basePath", () => {
    const request = new Request("http://test.com/this-will-be-removed");
    const basePath = "/test";

    expect(resolveBaseUrl(request, undefined, basePath).toString()).toBe(
      "http://test.com/test"
    );
  });
});

describe("generatePostButtonTargetURL", () => {
  it("generates an URL for post button without target and without state", () => {
    const expected = new URL("/", "http://test.com");
    expected.searchParams.set("__bi", "1-p");

    expect(
      generateButtonTargetURL({
        target: undefined,
        buttonAction: "post",
        buttonIndex: 1,
        baseUrl: new URL("http://test.com"),
      })
    ).toBe(expected.toString());
  });

  it("generates an URL for post button without target and with state", () => {
    const expected = new URL("/", "http://test.com");
    expected.searchParams.set("test", "test");
    expected.searchParams.set("__bi", "1-p");

    expect(
      generateButtonTargetURL({
        buttonAction: "post",
        buttonIndex: 1,
        baseUrl: new URL("http://test.com"),
        target: { query: { test: "test" } },
      })
    ).toBe(expected.toString());
  });

  it("generates an URL for post button with target and without state", () => {
    const expected = new URL("/test", "http://test.com");
    expected.searchParams.set("__bi", "1-p");

    expect(
      generateButtonTargetURL({
        target: "/test",
        buttonAction: "post",
        buttonIndex: 1,
        baseUrl: new URL("http://test.com"),
      })
    ).toBe(expected.toString());
  });

  it("generates an URL for post button with target and with state", () => {
    const expected = new URL("/test", "http://test.com");
    expected.searchParams.set("test", "test");
    expected.searchParams.set("__bi", "1-p");

    expect(
      generateButtonTargetURL({
        buttonAction: "post",
        buttonIndex: 1,
        baseUrl: new URL("http://test.com"),
        target: { query: { test: "test" }, pathname: "/test" },
      })
    ).toBe(expected.toString());
  });

  it("also supports post_redirect button", () => {
    const expected = new URL("/test", "http://test.com");
    expected.searchParams.set("__bi", "1-pr");

    expect(
      generateButtonTargetURL({
        target: "/test",
        buttonAction: "post_redirect",
        buttonIndex: 1,
        baseUrl: new URL("http://test.com"),
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
    url.searchParams.set("__bi", "5-p");

    expect(parseButtonInformationFromTargetURL(url)).toBeUndefined();
  });

  it("returns undefined if button action is not valid", () => {
    const url = new URL("http://test.com");
    url.searchParams.set("__bi", "1-unknown");

    expect(parseButtonInformationFromTargetURL(url)).toBeUndefined();
  });

  it("parses button information from URL for post button", () => {
    const url = new URL("http://test.com");
    url.searchParams.set("__bi", "1-p");

    expect(parseButtonInformationFromTargetURL(url)).toEqual({
      action: "post",
      index: 1,
    });
  });

  it("parses button information from URL for post_redirect button", () => {
    const url = new URL("http://test.com");
    url.searchParams.set("__bi", "1-pr");

    expect(parseButtonInformationFromTargetURL(url)).toEqual({
      action: "post_redirect",
      index: 1,
    });
  });

  it("parses state if button information is valid and state is present and is also valid", () => {
    const url = new URL("http://test.com");
    url.searchParams.set("__bi", "1-p");
    url.searchParams.set("test", "test");

    expect(parseButtonInformationFromTargetURL(url)).toEqual({
      action: "post",
      index: 1,
    });
  });
});

describe("joinPaths", () => {
  it("returns pathA when pathB is empty string", () => {
    expect(joinPaths("/base", "")).toBe("/base");
  });

  it("returns pathA when pathB is /", () => {
    expect(joinPaths("/base", "/")).toBe("/base");
  });

  it("joins two paths correctly", () => {
    expect(joinPaths("/base", "/path")).toBe("/base/path");
  });

  it("removes duplicate slashes", () => {
    expect(joinPaths("/base/", "/path")).toBe("/base/path");
    expect(joinPaths("/base//", "//path")).toBe("/base/path");
  });

  it("handles paths without leading slash", () => {
    expect(joinPaths("base", "path")).toBe("base/path");
  });
});

describe("parseSearchParams", () => {
  it("returns empty object for URL without search params", () => {
    const url = new URL("http://test.com");
    expect(parseSearchParams(url)).toEqual({ searchParams: {} });
  });

  it("parses single search param", () => {
    const url = new URL("http://test.com?key=value");
    expect(parseSearchParams(url)).toEqual({ searchParams: { key: "value" } });
  });

  it("parses multiple search params", () => {
    const url = new URL("http://test.com?a=1&b=2&c=3");
    expect(parseSearchParams(url)).toEqual({
      searchParams: { a: "1", b: "2", c: "3" },
    });
  });
});

describe("isFrameRedirect", () => {
  it("returns true for valid redirect object", () => {
    expect(isFrameRedirect({ kind: "redirect", location: "https://example.com" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isFrameRedirect(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isFrameRedirect(undefined)).toBe(false);
  });

  it("returns false for object without kind property", () => {
    expect(isFrameRedirect({ location: "https://example.com" })).toBe(false);
  });

  it("returns false for object with wrong kind value", () => {
    expect(isFrameRedirect({ kind: "other", location: "https://example.com" })).toBe(false);
  });

  it("returns false for primitive values", () => {
    expect(isFrameRedirect("redirect")).toBe(false);
    expect(isFrameRedirect(123)).toBe(false);
    expect(isFrameRedirect(true)).toBe(false);
  });
});

describe("isFrameDefinition", () => {
  it("returns true for object with image property", () => {
    expect(isFrameDefinition({ image: "https://example.com/image.png" })).toBe(true);
  });

  it("returns true for complete frame definition", () => {
    expect(
      isFrameDefinition({
        image: "https://example.com/image.png",
        buttons: [],
        state: { count: 0 },
      })
    ).toBe(true);
  });

  it("returns false for null", () => {
    expect(isFrameDefinition(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isFrameDefinition(undefined)).toBe(false);
  });

  it("returns false for object without image property", () => {
    expect(isFrameDefinition({ buttons: [] })).toBe(false);
  });

  it("returns false for primitive values", () => {
    expect(isFrameDefinition("image")).toBe(false);
    expect(isFrameDefinition(123)).toBe(false);
  });
});
