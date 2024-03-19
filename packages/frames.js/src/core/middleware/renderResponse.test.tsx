import { Button } from "../components";
import { redirect } from "../redirect";
import type { FramesContext } from "../types";
import { renderResponse } from "./renderResponse";

jest.mock("@vercel/og", () => {
  return {
    ImageResponse: class {
      arrayBuffer() {
        return new ArrayBuffer(10);
      }
    },
  };
});

describe("renderResponse middleware", () => {
  const render = renderResponse();
  const context: FramesContext = {
    basePath: "/",
    request: new Request("https://example.com"),
    currentURL: new URL("https://example.com"),
  };

  beforeEach(() => {
    context.request = new Request("https://example.com");
  });

  it("returns redirect Response if redirect is returned from handler", async () => {
    const result = await render(context, async () => {
      return redirect("https://example.com");
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("location")).toBe(
      "https://example.com"
    );
  });

  it("allows custom status code and headers for redirect", async () => {
    const result = await render(context, async () => {
      return redirect("https://example.com", {
        status: 307,
        headers: { "X-Test": "test" },
      });
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(307);
    expect((result as Response).headers.get("location")).toBe(
      "https://example.com"
    );
    expect((result as Response).headers.get("x-test")).toBe("test");
  });

  it("allows to render a Response frame with custom status code and headers", async () => {
    const result = await render(context, async () => {
      return new Response("Hello", {
        status: 201,
        headers: { "X-Test": "test" },
      });
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(201);
    expect((result as Response).headers.get("x-test")).toBe("test");
  });

  it("allows to render a frame with image defined as react element", async () => {
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button action="post" state="customStateValue1">
            Click me 1
          </Button>,
          <Button action="post" state={{ a: true }} target="/a/b">
            Click me 2
          </Button>,
          <Button action="post" state={10} target="/test">
            Click me 3
          </Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    await expect((result as Response).text()).resolves.toMatchSnapshot();
  });

  it("allows to render a frame as json if Accept header is used", async () => {
    context.request = new Request("https://example.com", {
      headers: {
        Accept: "application/json",
      },
    });
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button action="post" state="customStateValue1">
            Click me 1
          </Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    expect((result as Response).headers.get("Content-Type")).toBe(
      "application/json"
    );
    await expect((result as Response).text()).resolves.toMatchSnapshot();
  });

  it("properly resolves against basePath", async () => {
    context.basePath = "/prefixed";
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button action="post" state="customStateValue1" target="test">
            Click me 1
          </Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    await expect((result as Response).text()).resolves.toMatchSnapshot();
  });

  it("renders text input", async () => {
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        textInput: "My input",
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    await expect((result as Response).text()).resolves.toMatchSnapshot();
  });
});
