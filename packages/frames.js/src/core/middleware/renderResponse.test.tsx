import { Button } from "../components";
import { redirect } from "../redirect";
import type { FramesContext } from "../types";
import { renderResponse } from "./renderResponse";
import * as vercelOg from "@vercel/og";

jest.mock("@vercel/og", () => {
  const arrayBufferMock = jest.fn(() => new ArrayBuffer(10));
  const constructorMock = jest.fn(
    () =>
      new (class {
        arrayBuffer = arrayBufferMock;
      })()
  );

  return {
    arrayBufferMock,
    constructorMock,
    ImageResponse: class {
      constructor(...args: any[]) {
        // @ts-expect-error
        return constructorMock(...args);
      }
      arrayBuffer = arrayBufferMock;
    },
  };
});

describe("renderResponse middleware", () => {
  let arrayBufferMock: jest.Mock = (vercelOg as any).arrayBufferMock;
  let constructorMock: jest.Mock = (vercelOg as any).constructorMock;
  const render = renderResponse();
  const context: FramesContext = {
    basePath: "/",
    request: new Request("https://example.com"),
    currentURL: new URL("https://example.com"),
  };

  beforeEach(() => {
    arrayBufferMock.mockClear();
    constructorMock.mockClear();
    context.request = new Request("https://example.com");
    context.currentURL = new URL("https://example.com");
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

  it("returns error 500 if image rendering fails", async () => {
    arrayBufferMock.mockRejectedValueOnce(
      new Error("Something failed during render")
    );
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    await expect((result as Response).text()).resolves.toBe(
      "Could not render image"
    );
  });

  it("returns 500 if invalid number of buttons is provided", async () => {
    // @ts-expect-error
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          <Button action="post">Click me 1</Button>,
          <Button action="post">Click me 2</Button>,
          <Button action="post">Click me 3</Button>,
          <Button action="post">Click me 4</Button>,
          <Button action="post">Click me 5</Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    await expect((result as Response).text()).resolves.toBe(
      "Only 4 buttons are allowed"
    );
  });

  it("returns 500 if unrecognized button action is provided", async () => {
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          // @ts-expect-error
          <Button action="invalid">Click me 1</Button>,
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    await expect((result as Response).text()).resolves.toBe(
      "Unrecognized button action"
    );
  });

  it("returns 500 if invalid button shape is provided", async () => {
    // @ts-expect-error
    const result = await render(context, async () => {
      return {
        image: <div>My image</div>,
        buttons: [
          // this is not a proper object created by React.createElement()
          { action: "link", props: "invalid" },
        ],
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    await expect((result as Response).text()).resolves.toBe(
      "Invalid button provided"
    );
  });

  it("correctly renders image wich conditional content", async () => {
    const newContext = context;

    let result = await render(newContext, async () => {
      return {
        image: (
          <span>
            {"something" in newContext
              ? "Something is there"
              : "Something is not there"}
          </span>
        ),
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);

    expect(constructorMock).toHaveBeenCalledTimes(1);
    expect(constructorMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object)
    );
    expect(constructorMock.mock.calls[0][0]).toMatchSnapshot();

    // @ts-expect-error
    newContext.something = "true";

    result = await render(newContext, async () => {
      return {
        image: (
          <span>
            {"something" in newContext
              ? "Something is there"
              : "Something is not there"}
          </span>
        ),
      };
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);

    expect(constructorMock).toHaveBeenCalledTimes(2);
    expect(constructorMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object)
    );
    expect(constructorMock.mock.calls[1][0]).toMatchSnapshot();
  });
});
