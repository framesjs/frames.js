export class RequestBodyNotJSONError extends Error {
  constructor() {
    super("Invalid frame action payload, request body is not JSON");
  }
}

export class InvalidFrameActionPayloadError extends Error {
  constructor(message = "Invalid frame action payload") {
    super(message);
  }
}

export class FrameMessageError extends Error {
  status: number;

  /**
   *
   * @param message - Message to show the user (up to 90 characters)
   * @param status - 4XX status code
   */
  constructor(message: string, status: number) {
    if (message.length > 90) throw new Error("Message too long");
    if (status < 400 || status >= 500) throw new Error("Invalid status code");

    super(message);
    this.status = status;
  }
}
