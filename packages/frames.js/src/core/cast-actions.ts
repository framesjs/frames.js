import type {
  CastActionResponse,
  ComposerActionFormResponse,
  CastActionFrameResponse,
  CastActionMessageResponse,
} from "./types";

/**
 * Returns a response defining composer action.
 */
export function castAction(definition: CastActionResponse): Response {
  return Response.json(definition);
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
