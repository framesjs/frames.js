import { NextRequest } from "next/server";
import * as lib from ".";

describe("next adapter", () => {
  it.each(["Button", "createFrames", "fetchMetadata"])(
    "exports %s",
    (exportName) => {
      expect(lib).toHaveProperty(exportName);
    }
  );

  it("correctly integrates with next.js", async () => {
    type State = {
      test: boolean;
    };
    const frames = lib.createFrames<State>({
      initialState: {
        test: false,
      },
    });

    const handleRequest = frames((ctx) => {
      expect(ctx.state).toEqual({ test: false });

      return {
        image: "http://test.png",
        // satisfies is here so if also check if type is correct
        state: ctx.state satisfies State,
      };
    });

    await expect(
      handleRequest(new NextRequest("http://localhost:3000"))
    ).resolves.toHaveProperty("status", 200);
  });
});
