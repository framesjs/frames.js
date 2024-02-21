// TODO: Find a better name for this

import { BaseFrameActionPayload, ProtocolValidatorArray } from ".";
import { validators } from "./validators";

const allValidators = Object.values(validators);

export async function getFrameMessageNew(
  actionPayload: BaseFrameActionPayload,
  validators: ProtocolValidatorArray = allValidators as ProtocolValidatorArray
) {
  for (const validator of validators) {
    const frameMessage = await validator.validate(actionPayload);
    if (frameMessage) return { ...frameMessage, validator };
  }
  throw new Error("No validator could parse the frame message");
}
