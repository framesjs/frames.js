/**
 * Error thrown when the request body cannot be parsed as JSON.
 * This typically occurs when the frame action payload is malformed.
 */
export class RequestBodyNotJSONError extends Error {
  constructor() {
    super("Invalid frame action payload, request body is not JSON");
  }
}

/**
 * Error thrown when the frame action payload is invalid.
 * This occurs when the payload doesn't contain the expected structure.
 */
export class InvalidFrameActionPayloadError extends Error {
  constructor(message = "Invalid frame action payload") {
    super(message);
  }
}

/**
 * Error class for frame message validation errors.
 * Used to return user-facing error messages with appropriate HTTP status codes.
 */
export class FrameMessageError extends Error {
  status: number;

  /**
   * Creates a new FrameMessageError.
   * @param message - Message to show the user (up to 90 characters)
   * @param status - HTTP status code (must be 4XX)
   * @throws Error if message exceeds 90 characters
   * @throws Error if status code is not in 4XX range
   */
  constructor(message: string, status: number) {
    if (message.length > 90) throw new Error("Message too long");
    if (status < 400 || status >= 500) throw new Error("Invalid status code");

    super(message);
    this.status = status;
  }
}

