import * as lib from ".";

describe("remix adapter", () => {
  it.each(["createFrames", "Button", "fetchMetadata"])(
    "exports %s",
    (exportName) => {
      expect(lib).toHaveProperty(exportName);
    }
  );
});
