export class RequestBodyNotJSONError extends Error {
  constructor() {
    super("Invalid frame action payload");
  }
}

export class InvalidFrameActionPayloadError extends Error {
  constructor() {
    super("Invalid frame action payload");
  }
}
