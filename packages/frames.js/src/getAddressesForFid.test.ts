import { getAddressesForFid } from "./getAddressesForFid";

describe("getAddressesForFid", () => {
  it("should get address for fid with connected address", async () => {
    const fid = 1689;
    const addresses = await getAddressesForFid({ fid });
    console.log(addresses);
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses[0]?.type).toBe("verified");
  });

  it("should fall back to custody address", async () => {
    const fid = 1;
    const addresses = await getAddressesForFid({ fid });
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses[addresses.length - 1]?.type).toBe("custody");
  });
});
