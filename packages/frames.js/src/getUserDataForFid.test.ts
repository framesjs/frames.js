import { getUserDataForFid } from ".";

describe("getUserDataForFid", () => {
  it("should get latest user data for fid", async () => {
    const fid = 1214;
    const userData = await getUserDataForFid({ fid });
    expect(userData).not.toBe(null);
  });

  it("should return null for invalid fid", async () => {
    const fid = 1000000000000;
    const userData = await getUserDataForFid({ fid });
    expect(userData).toBe(null);
  });
});
