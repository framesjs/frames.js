import generate from "@babel/generator";
import {
  Expression,
  JSXAttribute,
  JSXElement,
  JSXExpressionContainer,
  JSXFragment,
  JSXSpreadChild,
  JSXText,
  ObjectProperty,
  StringLiteral,
  arrayExpression,
  booleanLiteral,
  identifier,
  jsxAttribute,
  jsxClosingElement,
  jsxClosingFragment,
  jsxElement,
  jsxExpressionContainer,
  jsxFragment,
  jsxIdentifier,
  jsxOpeningElement,
  jsxOpeningFragment,
  jsxText,
  nullLiteral,
  numericLiteral,
  objectExpression,
  objectProperty,
  stringLiteral,
  tsAnyKeyword,
  tsTypeAnnotation,
  tsTypeParameterInstantiation,
  tsTypeReference,
  variableDeclaration,
  variableDeclarator,
  addComment,
} from "@babel/types";
import type { types } from "frames.js/core";
import { Fragment } from "react";

export function frameDefinitionToString(
  frame: Partial<types.FrameDefinition<any>>
): string {
  const id = identifier("frame");

  id.typeAnnotation = tsTypeAnnotation(
    tsTypeReference(
      identifier("FrameDefinition"),
      tsTypeParameterInstantiation([tsAnyKeyword()])
    )
  );

  const properties: ObjectProperty[] = [];

  if (frame.accepts) {
    for (const accept of frame.accepts) {
      properties.push(
        objectProperty(identifier(accept.id), stringLiteral(accept.version))
      );
    }
  }

  if (frame.image) {
    properties.push(
      objectProperty(
        identifier("image"),
        typeof frame.image === "string"
          ? stringLiteral(frame.image)
          : reactElementToJsx(frame.image)
      )
    );
  } else {
    // add commented out image property with comment explaining why it's commented out
    const value = stringLiteral("");

    addComment(
      value,
      "trailing",
      " Image property is empty because the frames does not have an image or the image is a data URL which is not supported. "
    );

    properties.push(objectProperty(identifier("image"), value));
  }

  if (frame.imageOptions?.aspectRatio) {
    properties.push(
      objectProperty(
        identifier("imageOptions"),
        objectExpression([
          objectProperty(
            identifier("aspectRatio"),
            stringLiteral(frame.imageOptions.aspectRatio)
          ),
        ])
      )
    );
  }

  if (frame.textInput) {
    properties.push(
      objectProperty(identifier("textInput"), stringLiteral(frame.textInput))
    );
  }

  if (frame.buttons) {
    properties.push(
      objectProperty(
        identifier("buttons"),
        arrayExpression(frame.buttons.map(buttonToJsx))
      )
    );
  }

  const definition = variableDeclaration("const", [
    variableDeclarator(id, objectExpression(properties)),
  ]);

  return generate(definition, {}).code;
}

function buttonToJsx(button: types.AllowedFrameButtonItems): Expression {
  if (button === null) {
    return nullLiteral();
  }

  if (button === undefined) {
    return identifier("undefined");
  }

  if (typeof button === "boolean") {
    return booleanLiteral(button);
  }

  let label: string;
  let props: Record<string, unknown> = {};

  if ("props" in button) {
    const { children, ...restProps } = button.props;
    label = children;
    props = restProps;
  } else {
    const { label: l, ...restProps } = button;
    label = l;
    props = restProps;
  }

  const attributes: JSXAttribute[] = [];

  for (const [key, value] of Object.entries(props)) {
    let val: StringLiteral | JSXExpressionContainer | undefined;

    if (typeof value === "string") {
      val = stringLiteral(value);
    } else if (typeof value === "number") {
      val = jsxExpressionContainer(numericLiteral(value));
    } else if (typeof value === "boolean") {
      val = jsxExpressionContainer(booleanLiteral(value));
    } else if (value === null) {
      val = jsxExpressionContainer(nullLiteral());
    } else if (value === undefined) {
      val = undefined;
    } else {
      continue; // skip
    }

    attributes.push(jsxAttribute(jsxIdentifier(key), val));
  }

  return jsxElement(
    jsxOpeningElement(jsxIdentifier("Button"), attributes),
    jsxClosingElement(jsxIdentifier("Button")),
    [jsxText(label)]
  );
}

type AllowedJSXChildren =
  | JSXText
  | JSXExpressionContainer
  | JSXSpreadChild
  | JSXElement
  | JSXFragment;

type SupportedChildren =
  | React.ReactElement
  | string
  | number
  | boolean
  | null
  | undefined;

function reactElementToJsx(
  image: React.ReactElement<
    Record<string, unknown> & { children?: SupportedChildren[] }
  >
): JSXElement | JSXFragment {
  const attributes: JSXAttribute[] = [];

  for (const [prop, propValue] of Object.entries(image.props)) {
    if (prop === "children") {
      continue;
    }

    if (typeof propValue === "string") {
      attributes.push(
        jsxAttribute(jsxIdentifier(prop), stringLiteral(propValue))
      );
    } else if (typeof propValue === "number") {
      attributes.push(
        jsxAttribute(
          jsxIdentifier(prop),
          jsxExpressionContainer(numericLiteral(propValue))
        )
      );
    } else if (typeof propValue === "boolean") {
      attributes.push(
        jsxAttribute(
          jsxIdentifier(prop),
          jsxExpressionContainer(booleanLiteral(propValue))
        )
      );
    } else if (propValue === null) {
      attributes.push(
        jsxAttribute(jsxIdentifier(prop), jsxExpressionContainer(nullLiteral()))
      );
    } else if (propValue === undefined) {
      attributes.push(
        jsxAttribute(
          jsxIdentifier(prop),
          jsxExpressionContainer(identifier("undefined"))
        )
      );
    }
  }

  if (image.type === Fragment) {
    return jsxFragment(
      jsxOpeningFragment(),
      jsxClosingFragment(),
      image.props.children?.map(childToJsx) ?? []
    );
  } else if (typeof image.type === "string") {
    return jsxElement(
      jsxOpeningElement(jsxIdentifier(image.type), attributes),
      jsxClosingElement(jsxIdentifier(image.type)),
      image.props.children?.map(childToJsx) ?? []
    );
  }

  console.error(image);
  throw new Error("Not implemented");
}

function childToJsx(child: SupportedChildren): AllowedJSXChildren {
  if (child === null) {
    return jsxExpressionContainer(nullLiteral());
  }

  if (child === undefined) {
    return jsxExpressionContainer(identifier("undefined"));
  }

  if (typeof child === "boolean") {
    return jsxExpressionContainer(booleanLiteral(child));
  }

  if (typeof child === "number") {
    return jsxExpressionContainer(numericLiteral(child));
  }

  if (typeof child === "string") {
    return jsxText(child);
  }

  return reactElementToJsx(child);
}
