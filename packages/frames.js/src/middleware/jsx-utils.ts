import { Children as ReactChildren, Fragment, createElement } from "react";

export type SerializedNode =
  | {
      type: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we need to handle any type
      props: Record<string, any> & {
        children: SerializedNode[];
      };
    }
  | (string | number | boolean | null | undefined);

export function deserializeJsx(
  serialized: SerializedNode[]
): React.ReactElement {
  // Map over each serialized node and convert it to a React element or a text node
  const elements = serialized.map((node) => {
    if (typeof node === "object" && node !== null && "type" in node) {
      // It's an element object with type and props
      const children = node.props.children
        ? deserializeJsx(node.props.children)
        : [];
      const { children: _, ...restProps } = node.props;
      return createElement(
        node.type === "Symbol(react.fragment)" ? Fragment : node.type,
        {
          ...restProps,
          key: "key" in node ? (node.key as string) : Math.random().toString(),
        },
        children
      );
    } else if (node !== null && node !== undefined) {
      // It's a primitive value, so just return it as is (React can render strings and numbers directly)
      return node;
    }
    // Null or undefined children are valid in React and can simply be ignored
    return null;
  });

  // If there's only one top-level node, return it directly, otherwise return the array
  return (elements.length === 1 ? elements[0] : elements) as JSX.Element;
}
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- we need to handle any type */
function serializeChild(
  child: React.ReactElement | null | undefined | boolean | string
): SerializedNode {
  if (typeof child !== "object" || !child) {
    return child;
  }

  if ("props" in child) {
    let serialized: React.ReactElement = { ...child };

    if ("children" in child.props && child.props.children) {
      const childChildren = serializeJsx(
        child.props.children as React.ReactElement
      );

      serialized = {
        ...serialized,
        props: {
          ...serialized.props,
          children: childChildren,
        },
      };
    }

    // If the child is a functional component, evaluate it and return the evaluation result
    if (typeof child.type === "function") {
      const evaluated = (child.type as CallableFunction)(
        child.props
      ) as React.ReactElement | null;

      if (evaluated === null || typeof evaluated !== "object") {
        return evaluated;
      }

      const serializedEvaluated = serializeChild({ ...evaluated });

      if (
        serializedEvaluated === null ||
        typeof serializedEvaluated !== "object"
      ) {
        return serializedEvaluated;
      }

      serialized = { ...serializedEvaluated, key: Math.random().toString() };
    }

    return {
      type: serialized.type.toString(),
      props: serialized.props,
    };
  }
}

export function serializeJsx(children: React.ReactElement): SerializedNode[] {
  return ReactChildren.map(children, serializeChild);
}
