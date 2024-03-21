import * as lib from ".";

describe("next adapter", () => {
  it.each(["Button", "createFrames", "fetchMetadata"])(
    "exports %s",
    (exportName) => {
      expect(lib).toHaveProperty(exportName);
    }
  );
});
