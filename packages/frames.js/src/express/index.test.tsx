import express from "express";
import request from "supertest";
import * as lib from ".";
import { FRAMES_META_TAGS_HEADER } from "../core";

describe("express adapter", () => {
  it.each(["createFrames", "Button"])("exports %s", (exportName) => {
    expect(lib).toHaveProperty(exportName);
  });

  it("properly correctly integrates with express.js app", async () => {
    const app = express();
    const frames = lib.createFrames();
    const expressHandler = frames(async ({ request }) => {
      expect(request).toBeInstanceOf(Request);
      expect(request.url).toMatch(/http:\/\/127\.0\.0\.1:\d+\//);

      return {
        image: <span>Nehehe</span>,
        buttons: [
          <lib.Button action="post" key="1">
            Click me
          </lib.Button>,
        ],
      };
    });

    app.use("/", expressHandler);

    await request(app).get("/").expect("Content-Type", "text/html").expect(200);
  });

  it("properly correctly integrates with express.js app and returns JSON if asked to", async () => {
    const app = express();
    const frames = lib.createFrames();
    const expressHandler = frames(async ({ request }) => {
      expect(request).toBeInstanceOf(Request);
      expect(request.url).toMatch(/http:\/\/127\.0\.0\.1:\d+\//);

      return {
        image: <span>Nehehe</span>,
        buttons: [
          <lib.Button action="post" key="1">
            Click me
          </lib.Button>,
        ],
      };
    });

    app.use("/", expressHandler);

    await request(app)
      .get("/")
      .set("Accept", FRAMES_META_TAGS_HEADER)
      .expect("Content-Type", "application/json")
      .expect(200);
  });

  it("properly handles error response", async () => {
    const app = express();
    const frames = lib.createFrames();
    const expressHandler = frames(async () => {
      throw new Error("Something went wrong");
    });

    app.use("/", expressHandler);

    await request(app)
      .get("/")
      .expect(500)
      .expect("Content-type", "text/plain");
  });

  it("resolves button targets correctly", async () => {
    const app = express();
    const frames = lib.createFrames({ basePath: "/api" });
    const expressHandler = frames(async ({ request }) => {
      expect(request).toBeInstanceOf(Request);
      expect(request.url).toMatch(/http:\/\/127\.0\.0\.1:\d+\//);

      return {
        image: <span>Nehehe</span>,
        buttons: [
          <lib.Button action="post" key="1" target="/nested">
            Click me
          </lib.Button>,
        ],
      };
    });

    app.use("/api", expressHandler);

    await request(app)
      .get("/api")
      .set("Accept", FRAMES_META_TAGS_HEADER)
      .expect(200)
      .expect("Content-type", "application/json")
      .expect((res) => {
        expect(res.body["fc:frame:button:1:target"]).toMatch(
          /http:\/\/127\.0\.0\.1:\d+\/api\/nested/
        );
      });
  });
});
