import type { FramePlainObjectButtonElement } from "./types";

/**
 * Defines a button in a typesafe way without the React requirement. This is just a helper to have IDE autocompletion.
 *
 * @example
 * ```ts
 * import { button } from "frames.js/core";
 *
 * {
 *    buttons: [
 *      button({
 *        action: "post",
 *        label: "Click me",
 *        target: "/",
 *    }),
 *   ],
 * }
 * ```
 */
export function button(
  props: FramePlainObjectButtonElement
): FramePlainObjectButtonElement {
  return props;
}
