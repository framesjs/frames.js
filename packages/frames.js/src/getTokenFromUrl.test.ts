import { getTokenFromUrl } from ".";

describe("getTokenFromUrl", () => {
  it("should get the token from the token url", async () => {
    expect(
      getTokenFromUrl(
        "eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df:123"
      )
    ).toEqual({
      namespace: "eip155",
      chainId: 7777777,
      address: "0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
      tokenId: "123",
    });
  });

  it("throws for invalid url", async () => {
    expect(() => getTokenFromUrl("a")).toThrow("Invalid token URL");
  });
});
