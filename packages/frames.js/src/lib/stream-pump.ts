import { Stream } from "node:stream";
import type { Writable, Readable } from "node:stream";

export class StreamPump {
  public highWaterMark: number;
  public accumalatedSize: number;
  private stream: Stream & {
    readableHighWaterMark?: number;
    readable?: boolean;
    resume?: () => void;
    pause?: () => void;
    destroy?: (error?: Error) => void;
  };
  private controller?: ReadableStreamController<Uint8Array>;

  constructor(
    stream: Stream & {
      readableHighWaterMark?: number;
      readable?: boolean;
      resume?: () => void;
      pause?: () => void;
      destroy?: (error?: Error) => void;
    }
  ) {
    this.highWaterMark =
      stream.readableHighWaterMark ||
      new Stream.Readable().readableHighWaterMark;
    this.accumalatedSize = 0;
    this.stream = stream;
  }

  size(chunk: Uint8Array): number {
    return chunk.byteLength || 0;
  }

  start(controller: ReadableStreamController<Uint8Array>): void {
    this.controller = controller;
    this.stream.on("data", this.enqueue);
    this.stream.once("error", this.error);
    this.stream.once("end", this.close);
    this.stream.once("close", this.close);
  }

  pull(): void {
    this.resume();
  }

  cancel(reason?: Error): void {
    if (this.stream.destroy) {
      this.stream.destroy(reason);
    }

    this.stream.off("data", this.enqueue);
    this.stream.off("error", this.error);
    this.stream.off("end", this.close);
    this.stream.off("close", this.close);
  }

  enqueue = (chunk: Uint8Array | string): void => {
    if (this.controller) {
      try {
        const bytes = chunk instanceof Uint8Array ? chunk : Buffer.from(chunk);

        const available = (this.controller.desiredSize || 0) - bytes.byteLength;
        this.controller.enqueue(bytes);
        if (available <= 0) {
          this.pause();
        }
      } catch (error) {
        this.controller.error(
          new Error(
            "Could not create Buffer, chunk must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object"
          )
        );
        this.cancel();
      }
    }
  };

  pause(): void {
    if (this.stream.pause) {
      this.stream.pause();
    }
  }

  resume(): void {
    if (this.stream.readable && this.stream.resume) {
      this.stream.resume();
    }
  }

  close = (): void => {
    if (this.controller) {
      this.controller.close();
      delete this.controller;
    }
  };

  error = (error: Error): void => {
    if (this.controller) {
      this.controller.error(error);
      delete this.controller;
    }
  };
}

export function createReadableStreamFromReadable(
  source: Readable & { readableHighWaterMark?: number }
): ReadableStream<Uint8Array> {
  const pump = new StreamPump(source);
  const stream = new ReadableStream(pump, pump);
  return stream;
}

export async function writeReadableStreamToWritable<R = any>(
  stream: ReadableStream<R>,
  writable: Writable
): Promise<void> {
  const reader = stream.getReader();
  const flushable = writable as { flush?: () => void };

  try {
    // eslint-disable-next-line no-constant-condition, @typescript-eslint/no-unnecessary-condition -- this is expected to be exhaustive
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        writable.end();
        break;
      }

      writable.write(value);

      if (typeof flushable.flush === "function") {
        flushable.flush();
      }
    }
  } catch (error: unknown) {
    writable.destroy(error as Error);
    throw error;
  }
}
