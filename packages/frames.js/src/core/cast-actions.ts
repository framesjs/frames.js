import { getByteLength } from "../utils";
import type {
  CastActionResponse,
  ComposerActionFormResponse,
  CastActionFrameResponse,
  CastActionMessageResponse,
  ComposerActionResponse,
} from "./types";

/**
 * Returns a response defining composer action.
 */
export function castAction(definition: CastActionResponse): Response {
  if (getByteLength(definition.name) > 30) {
    throw new Error("Cast action name must be at most 30 characters long");
  }

  if (getByteLength(definition.description) > 80) {
    throw new Error(
      "Cast action description must be at most 80 characters long"
    );
  }

  return Response.json(definition);
}

/**
 * Returns a response defining composer action.
 */
export function composerAction(
  definition: Omit<ComposerActionResponse, "type">
): Response {
  if (getByteLength(definition.name) > 14) {
    throw new Error("Composer action name must be at most 14 characters long");
  }

  if (getByteLength(definition.description) > 20) {
    throw new Error(
      "Composer action description must be at most 20 characters long"
    );
  }

  return Response.json({
    ...definition,
    type: "composer",
  } satisfies ComposerActionResponse);
}

export function castActionFrame(frameUrl: string): Response {
  return Response.json({
    type: "frame",
    frameUrl,
  } satisfies CastActionFrameResponse);
}

export function castActionMessage(message: string): Response {
  return Response.json({
    message,
  } satisfies CastActionMessageResponse);
}

export function composerActionForm(
  payload: Omit<ComposerActionFormResponse, "type">
): Response {
  return Response.json({
    type: "form",
    ...payload,
  } satisfies ComposerActionFormResponse);
}
