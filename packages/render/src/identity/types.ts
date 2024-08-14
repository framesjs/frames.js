export type { VisibilityDetectionHook } from "../hooks/use-visibility-detection";

export type StorageSetterFunction<TValue> = (
  value: TValue | undefined
) => TValue;

export type StorageValueWatcher<TValue> = (value: TValue | undefined) => void;

export interface Storage {
  get: <T>(key: string) => Promise<T | undefined>;
  set: <T>(key: string, setter: StorageSetterFunction<T>) => Promise<void>;
  delete: (key: string) => Promise<void>;
  /**
   * Listener is called immediatelly after subscription so you get current value
   */
  watch: <T>(key: string, listener: StorageValueWatcher<T>) => () => void;
}

export interface FrameContextManager<TFrameContext> {
  frameContext: TFrameContext;
  setFrameContext: (frameContext: TFrameContext) => Promise<void>;
  resetFrameContext: () => Promise<void>;
}
