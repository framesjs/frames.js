import * as lib from ".";

describe("remix adapter", () => {
  it.each(["createFrames", "Button", "fetchMetadata"])(
    "exports %s",
    (exportName) => {
      expect(lib).toHaveProperty(exportName);
    }
  );

  it("correctly integrates with remix", async () => {
    type State = {
      test: boolean;
    };
    const frames = lib.createFrames<State>({
      initialState: {
        test: false,
      },
    });

    const handleRequest = frames(async (ctx) => {
      expect(ctx.state).toEqual({ test: false });

      return {
        image: "http://test.png",
        // satisfies is here so if also check if type is correct
        state: ctx.state satisfies State,
      };
    });

    await expect(
      handleRequest({
        request: new Request("http://localhost:3000"),
        params: {},
        context: {},
      })
    ).resolves.toHaveProperty("status", 200);
  });
});
