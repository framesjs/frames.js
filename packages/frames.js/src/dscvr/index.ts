import { FrameActionPayload } from '..';

export function isDscvrFrameActionPayload(
  frameActionPayload: FrameActionPayload
) {
  return (
    !!frameActionPayload.clientProtocol &&
    frameActionPayload.clientProtocol.startsWith('dscvr@')
  );
}
