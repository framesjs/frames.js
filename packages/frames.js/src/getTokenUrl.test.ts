import { getTokenUrl } from ".";
import { zora } from "viem/chains";

describe("getTokenUrl", () => {
  it("should get token url", async () => {
    expect(
      getTokenUrl({
        address: "0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
        tokenId: "123",
        chainId: "7777777",
      })
    ).toBe(`eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df:123`);

    expect(
      getTokenUrl({
        address: "0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
        tokenId: "123",
        chainId: "1",
      })
    ).toBe(`eip155:1:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df:123`);
  });

  it("should get token url with chain object", async () => {
    expect(
      getTokenUrl({
        address: "0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
        tokenId: "123",
        chain: zora,
      })
    ).toBe(`eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df:123`);
  });
});
