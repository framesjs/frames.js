import { getAddressesForFid } from ".";

describe("getAddressForFid", () => {
  it("should get address for fid with connected address", async () => {
    const fid = 1689;
    const address = await getAddressesForFid({ fid });
    expect(address).not.toBe(null);
  });

  it("should return null for fid without connected address", async () => {
    const fid = 1;
    const address = await getAddressesForFid({ fid });
    expect(address).not.toBe(null);
  });

  it("should fall back to custody address if specified", async () => {
    const fid = 1;
    const address = await getAddressesForFid({
      fid,
      options: { fallbackToCustodyAddress: true },
    });
    expect(address).not.toBe(null);
  });
});
