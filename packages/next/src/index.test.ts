import * as lib from ".";

describe("next adapter", () => {
  it.each(["Button", "createFrames", "fetchMetaData"])(
    "exports %s",
    (exportName) => {
      expect(lib).toHaveProperty(exportName);
    }
  );
});
