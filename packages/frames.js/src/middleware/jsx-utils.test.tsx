import { serializeJsx, deserializeJsx } from "./jsx-utils";

describe("serializeJsx", () => {
  it("correctly serializes an HTML element", () => {
    const element = <div />;
    expect(serializeJsx(element)).toEqual([
      {
        type: "div",
        props: {},
      },
    ]);
  });

  it("correctly serializes functional component", () => {
    function Test(): string {
      return "Hello";
    }

    expect(serializeJsx(<Test />)).toEqual(["Hello"]);
  });

  it("correctly serializes a Fragment", () => {
    expect(serializeJsx(<>Test</>)).toEqual([
      {
        props: {
          children: ["Test"],
        },
        type: "Symbol(react.fragment)",
      },
    ]);
  });

  it("correctly serializes a JSX element with nested array of children that are functional components", () => {
    function Test(): React.ReactElement {
      return <div>Test</div>;
    }

    const image = (
      <div>
        <Test />
        <Test />
      </div>
    );

    expect(serializeJsx(image)).toEqual([
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

  it("correctly serializes nested tree", () => {
    const element = (
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

    expect(serializeJsx(element)).toEqual([
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
                        { type: "span", props: { children: ["Test"] } },
                        { type: "span", props: { children: ["Test 2"] } },
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

  it("correctly serializes nested tree with fragments", () => {
    const element = (
      <div>
        <span>Test</span>
        <>
          <span>Test2</span>
          <span>Test3</span>
        </>
      </div>
    );

    expect(serializeJsx(element)).toEqual([
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
              type: "Symbol(react.fragment)",
              props: {
                children: [
                  {
                    type: "span",
                    props: {
                      children: ["Test2"],
                    },
                  },
                  {
                    type: "span",
                    props: {
                      children: ["Test3"],
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
});

describe("deserializeJsx", () => {
  it("correctly deserializes an HTML element", () => {
    const element = <div />;
    expect(deserializeJsx(serializeJsx(element))).toMatchSnapshot();
  });

  it("correctly deserializes functional component", () => {
    function Test(): string {
      return "Hello";
    }

    expect(deserializeJsx(serializeJsx(<Test />))).toMatchSnapshot();
  });

  it("correctly deserializes a Fragment", () => {
    expect(deserializeJsx(serializeJsx(<>Test</>))).toMatchSnapshot();
  });

  it("correctly deserializes nested tree", () => {
    const element = (
      <div>
        <span>Test</span>
        <span>Test2</span>
      </div>
    );

    expect(deserializeJsx(serializeJsx(element))).toMatchSnapshot();
  });

  it("is backwards compatible with old serialized format", () => {
    expect(
      deserializeJsx([
        {
          props: {
            children: [
              { props: { children: ["Test"] }, type: "div" },
              { props: { children: ["Test"] }, type: "div" },
            ],
          },
          type: "div",
        },
      ])
    ).toMatchSnapshot();
    expect(
      deserializeJsx([
        {
          props: {
            children: ["Test"],
            style: { color: "red" },
            tw: "flex bg-gray-500",
          },
          type: "div",
        },
      ])
    ).toMatchSnapshot();
  });
});
