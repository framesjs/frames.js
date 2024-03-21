import * as lib from ".";

describe("remix adapter", () => {
  it.each(["createFrames", "Button", "fetchMetaData"])(
    "exports %s",
    (exportName) => {
      expect(lib).toHaveProperty(exportName);
    }
  );
});
