import {
    RequestBodyNotJSONError,
    InvalidFrameActionPayloadError,
    FrameMessageError,
} from "./errors";

describe("RequestBodyNotJSONError", () => {
    it("has correct error message", () => {
        const error = new RequestBodyNotJSONError();
        expect(error.message).toBe(
            "Invalid frame action payload, request body is not JSON"
        );
    });

    it("is instance of Error", () => {
        const error = new RequestBodyNotJSONError();
        expect(error).toBeInstanceOf(Error);
    });
});

describe("InvalidFrameActionPayloadError", () => {
    it("has default error message", () => {
        const error = new InvalidFrameActionPayloadError();
        expect(error.message).toBe("Invalid frame action payload");
    });

    it("accepts custom error message", () => {
        const error = new InvalidFrameActionPayloadError("Custom error message");
        expect(error.message).toBe("Custom error message");
    });

    it("is instance of Error", () => {
        const error = new InvalidFrameActionPayloadError();
        expect(error).toBeInstanceOf(Error);
    });
});

describe("FrameMessageError", () => {
    it("creates error with valid message and status", () => {
        const error = new FrameMessageError("Test error message", 400);
        expect(error.message).toBe("Test error message");
        expect(error.status).toBe(400);
    });

    it("is instance of Error", () => {
        const error = new FrameMessageError("Test", 400);
        expect(error).toBeInstanceOf(Error);
    });

    it("throws error for message longer than 90 characters", () => {
        const longMessage = "a".repeat(91);
        expect(() => new FrameMessageError(longMessage, 400)).toThrow(
            "Message too long"
        );
    });

    it("allows message with exactly 90 characters", () => {
        const maxMessage = "a".repeat(90);
        const error = new FrameMessageError(maxMessage, 400);
        expect(error.message).toBe(maxMessage);
    });

    it("throws error for status code less than 400", () => {
        expect(() => new FrameMessageError("Test", 399)).toThrow(
            "Invalid status code"
        );
        expect(() => new FrameMessageError("Test", 200)).toThrow(
            "Invalid status code"
        );
    });

    it("throws error for status code 500 or greater", () => {
        expect(() => new FrameMessageError("Test", 500)).toThrow(
            "Invalid status code"
        );
        expect(() => new FrameMessageError("Test", 501)).toThrow(
            "Invalid status code"
        );
    });

    it("allows all valid 4XX status codes", () => {
        expect(() => new FrameMessageError("Test", 400)).not.toThrow();
        expect(() => new FrameMessageError("Test", 404)).not.toThrow();
        expect(() => new FrameMessageError("Test", 499)).not.toThrow();
    });
});
