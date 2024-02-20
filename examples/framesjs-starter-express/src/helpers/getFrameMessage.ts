import type {
    FrameMessageReturnType,
    GetFrameMessageOptions,
    FrameActionPayload
} from "frames.js";
import {
  getFrameMessage as _getFrameMessage,
} from "frames.js";

/** Convenience wrapper around `framesjs.getFrameMessage` that accepts a null for payload body.
 * Returns a `FrameActionData` object from the message trusted data. (e.g. button index, input text). The `fetchHubContext` option (default: true) determines whether to validate and fetch other metadata from hubs.
 * If `isValid` is false, the message should not be trusted.
 */
export async function getFrameMessage<T extends GetFrameMessageOptions>(
    frameActionPayload: FrameActionPayload | null,
    options?: T
  ): Promise<FrameMessageReturnType<T> | null> {
    if (options?.hubHttpUrl) {
      if (!options.hubHttpUrl.startsWith("http")) {
        throw new Error(
          `frames.js: Invalid Hub URL: ${options?.hubHttpUrl}, ensure you have included the protocol (e.g. https://)`
        );
      }
    }
  
    if (!frameActionPayload) {
      console.log(
        "info: no frameActionPayload, this is expected for the homeframe"
      );
      // no payload means no action
      return null;
    }
  
    const result = await _getFrameMessage(frameActionPayload, options);
  
    if (!result) {
      throw new Error("frames.js: something went wrong getting frame message");
    }
  
    return result;
  }