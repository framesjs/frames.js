import { FrameValidationData } from '@coinbase/onchainkit';
import { ALLOWED_ORIGIN } from '../config';

export function allowedOrigin(message?: FrameValidationData) {
  try {
    const url = new URL(message?.raw.action.url ?? '');
    const origin = url.hostname;
    return origin === ALLOWED_ORIGIN;
  } catch {
    return false;
  }
}
