import type { DetailedHTMLProps, HTMLAttributes, ReactElement } from "react";
import type { FrameDefinition, FramesContext } from "../../core/types";
import { resolveBaseUrl } from "../../core/utils";
import * as ImagesWorker from ".";

describe("imagesWorker", () => {
  const request = new Request("https://example.com");
  const context: FramesContext<undefined> = {
    basePath: "/",
    initialState: undefined,
    request,
    url: new URL("https://example.com"),
    baseUrl: resolveBaseUrl(request, undefined, "/"),
  };
  const imagesRoute = "https://example.com/image";
  const mw = ImagesWorker.imagesWorkerMiddleware({ imagesRoute });

  it("should add the image URL to the frame definition", async () => {
    const frameDefinition: FrameDefinition<undefined> = {
      image: <div>Test</div>,
    };

    const result = (await mw(context, () =>
      Promise.resolve(frameDefinition)
    )) as FrameDefinition<undefined>;

    expect(typeof result.image).toBe("string");

    const url = new URL(result.image as string);

    expect(url.origin).toBe("https://example.com");
    expect(url.pathname).toBe("/image");
    expect(url.searchParams.has("jsx")).toBe(true);
  });

  it("should not add the image URL to the frame definition if it's already a string", async () => {
    const frameDefinition: FrameDefinition<undefined> = {
      image: "/image.jpg",
    };

    const result = await mw(context, () => Promise.resolve(frameDefinition));

    expect(result).toEqual({
      image: "/image.jpg",
    });
  });

  it("should not add the image URL to the frame definition if it's not a frame definition", async () => {
    const response = new Response("not a frame definition");

    const result = await mw(context, () => Promise.resolve(response));

    expect(result).toEqual(response);
  });

  it("should include signature in request if secret is provided", async () => {
    const mwWithAuth = ImagesWorker.imagesWorkerMiddleware({
      imagesRoute,
      secret: "MY_SECRET",
    });

    const frameDefinition: FrameDefinition<undefined> = {
      image: <div>Test</div>,
    };

    const result = (await mwWithAuth(context, () =>
      Promise.resolve(frameDefinition)
    )) as FrameDefinition<undefined>;

    expect(new URL(result.image as string).searchParams.has("signature")).toBe(
      true
    );
  });

  it("should pass the default aspect ratio in the image URL", async () => {
    const frameDefinition: FrameDefinition<undefined> = {
      image: <div>Test</div>,
    };

    const result = (await mw(context, () =>
      Promise.resolve(frameDefinition)
    )) as FrameDefinition<undefined>;

    const url = new URL(result.image as string);

    expect(url.searchParams.get("aspectRatio")).toBe("1:1.91");
  });

  it("should pass the aspect ratio specified in the Frame Definition in the image URL", async () => {
    const frameDefinition: FrameDefinition<undefined> = {
      image: <div>Test</div>,
      imageOptions: {
        aspectRatio: "1:1",
      },
    };

    const result = (await mw(context, () =>
      Promise.resolve(frameDefinition)
    )) as FrameDefinition<undefined>;

    const url = new URL(result.image as string);

    expect(url.searchParams.get("aspectRatio")).toBe("1:1");
  });

  it("should serialize a JSX element with props", () => {
    const image = (
      // eslint-disable-next-line react/no-unknown-property -- tw is a Tailwind CSS prop
      <div tw="flex bg-gray-500" style={{ color: "red" }}>
        Test
      </div>
    );

    const serialized = ImagesWorker.serializeJsx(image);

    expect(serialized).toEqual([
      {
        type: "div",
        props: {
          children: ["Test"],
          tw: "flex bg-gray-500",
          style: { color: "red" },
        },
      },
    ]);
  });

  it("should serialize a JSX element with children", () => {
    const image = (
      <div>
        <span>Test</span>
      </div>
    );

    const serialized = ImagesWorker.serializeJsx(image);

    expect(serialized).toEqual([
      {
        type: "div",
        props: {
          children: [
            {
              type: "span",
              props: {
                children: ["Test"],
              },
            },
          ],
        },
      },
    ]);
  });

  it("should serialize a JSX element with multiple nested children", () => {
    const image = (
      <div>
        <span>Test</span>
        <span>Test 2</span>
        <div>
          <div>
            <span>Test</span>
            <span>Test 2</span>
          </div>
        </div>
      </div>
    );

    const serialized = ImagesWorker.serializeJsx(image);

    expect(serialized).toEqual([
      {
        type: "div",
        props: {
          children: [
            {
              type: "span",
              props: {
                children: ["Test"],
              },
            },
            {
              type: "span",
              props: {
                children: ["Test 2"],
              },
            },
            {
              type: "div",
              props: {
                children: [
                  {
                    type: "div",
                    props: {
                      children: [
                        {
                          type: "span",
                          props: {
                            children: ["Test"],
                          },
                        },
                        {
                          type: "span",
                          props: {
                            children: ["Test 2"],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
  });

  it("should serialize a JSX element with a functional component", () => {
    function Test({
      children,
      ...props
    }: DetailedHTMLProps<
      HTMLAttributes<HTMLDivElement>,
      HTMLDivElement
    >): ReactElement {
      return <div {...props}>{children}</div>;
    }

    const image = <Test tw="flex">Test</Test>;

    const serialized = ImagesWorker.serializeJsx(image);

    expect(serialized).toEqual([
      {
        type: "div",
        props: {
          children: ["Test"],
          tw: "flex",
        },
      },
    ]);
  });

  it("should serialize a JSX element with nested functional components", () => {
    function Test({
      children,
      ...props
    }: DetailedHTMLProps<
      HTMLAttributes<HTMLDivElement>,
      HTMLDivElement
    >): ReactElement {
      return <div {...props}>{children}</div>;
    }

    function Test2({
      children,
      ...props
    }: DetailedHTMLProps<
      HTMLAttributes<HTMLDivElement>,
      HTMLDivElement
    >): ReactElement {
      return <Test {...props}>{children}</Test>;
    }

    const image = <Test2 tw="flex">Test</Test2>;

    const serialized = ImagesWorker.serializeJsx(image);

    expect(serialized).toEqual([
      {
        type: "div",
        props: {
          children: ["Test"],
          tw: "flex",
        },
      },
    ]);
  });

  it("should serialize a JSX element with a functional component that returns null", () => {
    function Test(): ReactElement | null {
      return null;
    }

    const image = <Test />;

    const serialized = ImagesWorker.serializeJsx(image);

    expect(serialized).toEqual([]);
  });

  it("should serialize a JSX element with a functional component that returns a string", () => {
    function Test({ children }: { children: string }): string {
      return children;
    }

    const image = <Test>Test</Test>;

    const serialized = ImagesWorker.serializeJsx(image);

    expect(serialized).toEqual(["Test"]);
  });

  it("should serialize a JSX element with a functional component that returns a number", () => {
    function Test(): number {
      return 42;
    }

    const image = <Test />;

    const serialized = ImagesWorker.serializeJsx(image);

    expect(serialized).toEqual([42]);
  });

  it("should serialize a JSX element with nested array of children that are functional components", () => {
    function Test(): ReactElement {
      return <div>Test</div>;
    }

    const image = (
      <div>
        <Test />
        <Test />
      </div>
    );

    const serialized = ImagesWorker.serializeJsx(image);

    expect(serialized).toEqual([
      {
        type: "div",
        props: {
          children: [
            {
              type: "div",
              props: {
                children: ["Test"],
              },
            },
            {
              type: "div",
              props: {
                children: ["Test"],
              },
            },
          ],
        },
      },
    ]);
  });
});
