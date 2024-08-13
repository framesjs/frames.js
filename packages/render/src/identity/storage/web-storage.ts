import type {
  Storage,
  StorageValueWatcher,
  StorageSetterFunction,
} from "../types";

const localStorageUnavailableMessage =
  "WebStorage: localStorage is not available, consider implementing your own Storage class";

export class WebStorage implements Storage {
  /**
   * Keeps latest values in memory so we don't need to read them every time
   * we set or read the value.
   */
  private values: Map<string, unknown>;

  private watchers: Record<string, StorageValueWatcher<any>[]> = {};

  constructor() {
    this.values = new Map();
    this.watchers = {};
  }

  get = async <T>(key: string): Promise<T | undefined> => {
    if (this.values.has(key)) {
      return Promise.resolve(this.values.get(key) as T);
    }

    if (typeof localStorage !== "undefined") {
      const value = localStorage.getItem(key);

      if (!value) {
        return Promise.resolve(undefined);
      }

      const parsedValue = JSON.parse(value) as T;

      this.values.set(key, parsedValue);

      return Promise.resolve(parsedValue);
    }

    // eslint-disable-next-line no-console -- provide feedback
    console.warn(localStorageUnavailableMessage);

    return Promise.resolve(undefined);
  };

  set = async <T>(
    key: string,
    setter: StorageSetterFunction<T>
  ): Promise<void> => {
    // @todo create a queue of called setters and call them in order, so we don't have possible race conditions
    const currentValue = await this.get<T>(key);
    const newValue = setter(currentValue);

    this.values.set(key, newValue);
    this.notifyChange(key, newValue);

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(newValue));
      return;
    }

    // eslint-disable-next-line no-console -- provide feedback
    console.warn(localStorageUnavailableMessage);
  };

  delete = (key: string): Promise<void> => {
    this.values.delete(key);

    this.notifyChange(key, undefined);

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);

      return Promise.resolve();
    }

    // eslint-disable-next-line no-console -- provide feedback
    console.warn(localStorageUnavailableMessage);

    return Promise.resolve();
  };

  watch = <T>(key: string, listener: StorageValueWatcher<T>): (() => void) => {
    this.watchers[key] ??= [];
    this.watchers[key]?.push(listener);

    this.get<T>(key)
      .then((value) => {
        listener(value);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console -- provide feedback
        console.error(
          `@frames.js/render: Failed to get value from storage: ${e}`
        );
      });

    return () => {
      const listeners = this.watchers[key];

      if (listeners) {
        this.watchers[key] = listeners.filter(
          (watcher) => watcher !== listener
        );
      }
    };
  };

  private notifyChange = (key: string, value: unknown): void => {
    this.watchers[key]?.forEach((listener) => {
      listener(value);
    });
  };
}
