import { getUsernameForFid } from ".";

describe("getUsernameForFid", () => {
  it("should get latest username for fid", async () => {
    const fid = 1689;
    const username = await getUsernameForFid({ fid });
    expect(username).not.toBe(null);
  });

  it("should return null for invalid fid", async () => {
    const fid = 1000000000000;
    const username = await getUsernameForFid({ fid });
    expect(username).toBe(null);
  });

  it("should return null for no fid", async () => {
    const username = await getUsernameForFid({ fid: 0 });
    expect(username).toBe(null);
  });
});
