import type { Storage } from "../types";

const localStorageUnavailableMessage =
  "WebStorage: localStorage is not available, consider implementing your own Storage class";

export class WebStorage implements Storage {
  constructor() {
    if (typeof localStorage === "undefined") {
      // eslint-disable-next-line no-console -- provide feedback
      console.warn(localStorageUnavailableMessage);
    }
  }
  delete = (key: string): Promise<void> => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    } else {
      // eslint-disable-next-line no-console -- provide feedback
      console.warn(localStorageUnavailableMessage);
    }

    return Promise.resolve();
  };

  getObject = <T extends Record<string, unknown>>(
    key: string
  ): Promise<T | undefined> => {
    if (typeof localStorage !== "undefined") {
      const value = localStorage.getItem(key);

      if (!value) {
        return Promise.resolve(undefined);
      }

      return Promise.resolve(JSON.parse(value) as T);
    }

    // eslint-disable-next-line no-console -- provide feedback
    console.warn(localStorageUnavailableMessage);

    return Promise.resolve(undefined);
  };

  setObject = <T extends Record<string, unknown>>(
    key: string,
    value: T
  ): Promise<void> => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      // eslint-disable-next-line no-console -- provide feedback
      console.warn(localStorageUnavailableMessage);
    }

    return Promise.resolve();
  };
}
