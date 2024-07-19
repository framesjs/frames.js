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
  return Response.json(definition);
}

/**
 * Returns a response defining composer action.
 */
export function composerAction(
  definition: Omit<ComposerActionResponse, "type">
): Response {
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
