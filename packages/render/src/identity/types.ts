export type { VisibilityDetectionHook } from "../hooks/use-visibility-detection";

export interface Storage {
  getObject: <T extends Record<string, unknown>>(
    key: string
  ) => Promise<T | undefined>;
  setObject: <T extends Record<string, unknown>>(
    key: string,
    value: T
  ) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export interface FrameContextManager<TFrameContext> {
  frameContext: TFrameContext;
  setFrameContext: (frameContext: TFrameContext) => Promise<void>;
  resetFrameContext: () => Promise<void>;
}
