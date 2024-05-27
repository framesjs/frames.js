import type { PluginItem } from "@babel/core";
import { availablePresets, transform } from "@babel/standalone";
import * as t from "@babel/types";
import { createElement, Fragment } from "react";
import { Button as FrameButton } from "frames.js/core";

// declare createElement and Fragment in global scope
declare global {
  interface Window {
    __createElement: typeof createElement;
    __Fragment: typeof Fragment;
    __FrameButton: typeof FrameButton;
  }
}

if (typeof window !== "undefined") {
  window.__createElement = createElement;
  window.__Fragment = Fragment;
  window.__FrameButton = FrameButton;
}

/**
 * This plugin allows only const frame = {} code to be compiled, the rest is ignored
 */
function frameDefinitionPlugin(): PluginItem {
  return {
    visitor: {
      Program(path) {
        // remove all nodes except VariableDeclaration with name "frame"
        const frameDefinition = path.node.body.find(
          (node): node is t.VariableDeclaration => {
            if (!t.isVariableDeclaration(node)) {
              return false;
            }

            const idValue = node.declarations?.[0]?.id;
            const initValue = node.declarations?.[0]?.init;

            if (!t.isIdentifier(idValue) || idValue.name !== "frame") {
              return false;
            }

            if (!t.isObjectExpression(initValue)) {
              return false;
            }

            return true;
          }
        );

        if (!frameDefinition) {
          path.node.body = [];
          return;
        }

        const parenthesizedExpression = t.expressionStatement(
          t.parenthesizedExpression(frameDefinition.declarations[0]!.init!)
        );

        path.node.body = [parenthesizedExpression];
      },
      JSXIdentifier(path) {
        if (path.node.name === "Button") {
          path.node.name = "__FrameButton";
        }
      },
    },
  };
}

export async function compileCode(code: string) {
  const res = transform(code, {
    filename: "index.tsx",
    presets: [
      [availablePresets["env"], {}],
      [
        availablePresets["react"],
        {
          pure: false,
          runtime: "classic",
          // set to window by editor
          pragma: "__createElement",
          pragmaFrag: "__Fragment",
        },
      ],
      [availablePresets["typescript"], {}],
    ],
    plugins: [[frameDefinitionPlugin, {}]],
  });

  if (!res.code) {
    throw new Error("No code has been generated");
  }

  return res.code;
}
