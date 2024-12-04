/* eslint-disable @typescript-eslint/no-unsafe-assignment -- for expect.any() */
import {
  sign,
  verify,
  verifyCompact,
  encodeHeader,
  encodePayload,
  encodeSignature,
  decodeHeader,
  decodePayload,
  decodeSignature,
  constructJSONFarcasterSignatureAccountAssociationPaylod,
} from "./json-signature";

const fcDemoSignature = {
  header:
    "eyJmaWQiOjM2MjEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyY2Q4NWEwOTMyNjFmNTkyNzA4MDRBNkVBNjk3Q2VBNENlQkVjYWZFIn0",
  payload: "eyJkb21haW4iOiJmcmFtZXMtdjIudmVyY2VsLmFwcCJ9",
  signature:
    "MHhiNDIwMzQ1MGZkNzgzYTExZjRiOTllZTFlYjA3NmMwOTdjM2JkOTY1NGM2ODZjYjkyZTAyMzk2Y2Q0YjU2MWY1MjY5NjI5ZGQ5NTliYjU0YzEwOGI4OGVmNjdjMTVlZTdjZDc2YTRiMGU5NzkzNzA3YzkxYzFkOWFjNTg0YmQzNjFi",
};

const fcDemoCompactSignature = `${fcDemoSignature.header}.${fcDemoSignature.payload}.${fcDemoSignature.signature}`;

const framesJsDemoSignature = {
  header:
    "eyJmaWQiOjM0MTc5NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDc4Mzk3RDlEMTg1RDNhNTdEMDEyMTNDQmUzRWMxRWJBQzNFRWM3N2QifQ",
  payload: "eyJkb21haW4iOiJmcmFtZXNqcy5vcmcifQ",
  signature:
    "MHgwOWExNWMyZDQ3ZDk0NTM5NWJjYTJlNGQzNDg3MzYxMGUyNGZiMDFjMzc0NTUzYTJmOTM2NjM3YjU4YTA5NzdjNzAxOWZiYzljNGUxY2U5ZmJjOGMzNWVjYTllNzViMTM5Zjg3ZGQyNTBlMzhkMjBmM2YyZmEyNDk2MDQ1NGExMjFi",
};

const framesJsDemoCompactSignature =
  "eyJmaWQiOjM0MTc5NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDc4Mzk3RDlEMTg1RDNhNTdEMDEyMTNDQmUzRWMxRWJBQzNFRWM3N2QifQ.eyJkb21haW4iOiJmcmFtZXNqcy5vcmcifQ.MHgwOWExNWMyZDQ3ZDk0NTM5NWJjYTJlNGQzNDg3MzYxMGUyNGZiMDFjMzc0NTUzYTJmOTM2NjM3YjU4YTA5NzdjNzAxOWZiYzljNGUxY2U5ZmJjOGMzNWVjYTllNzViMTM5Zjg3ZGQyNTBlMzhkMjBmM2YyZmEyNDk2MDQ1NGExMjFi";

const signatures = [framesJsDemoSignature, fcDemoSignature];

const compactSignatures = [
  framesJsDemoCompactSignature,
  fcDemoCompactSignature,
];

describe("verifyCompact", () => {
  it.each(compactSignatures)("verifies valid message", async (signature) => {
    await expect(verifyCompact(signature)).resolves.toBe(true);
  });
});

describe("verify", () => {
  it.each(signatures)("verifies valid message", async (signature) => {
    await expect(verify(signature)).resolves.toBe(true);
  });
});

describe("sign", () => {
  it("signs any payload", async () => {
    const signature = await sign({
      fid: 1,
      payload: { test: true },
      signer: {
        type: "custody",
        custodyAddress: "0x1234567890abcdef1234567890abcdef12345678",
      },
      signMessage: async (message) => {
        expect(typeof message === "string").toBe(true);
        expect(message.length).toBeGreaterThan(0);

        return "0x0000000";
      },
    });

    expect(signature).toMatchObject({
      compact: expect.any(String),
      json: {
        header: expect.any(String),
        payload: expect.any(String),
        signature: expect.any(String),
      },
    });

    expect(decodePayload(signature.json.payload)).toEqual({ test: true });
    expect(decodeHeader(signature.json.header)).toEqual({
      fid: 1,
      type: "custody",
      key: "0x1234567890abcdef1234567890abcdef12345678",
    });
    expect(decodeSignature(signature.json.signature)).toEqual("0x0000000");
  });
});

describe("encodeHeader", () => {
  it("encodes header", () => {
    const value = encodeHeader(341794, {
      type: "custody",
      custodyAddress: "0x78397d9d185d3a57d01213cbe3ec1ebac3eec77d",
    });

    expect(typeof value).toBe("string");
  });
});

describe("encodePayload", () => {
  it("encodes payload", () => {
    const value = encodePayload(
      constructJSONFarcasterSignatureAccountAssociationPaylod("example.com")
    );

    expect(typeof value).toBe("string");
  });
});

describe("decodeHeader", () => {
  it("decodes header", () => {
    const encodedHeader = encodeHeader(341794, {
      type: "custody",
      custodyAddress: "0x78397d9d185d3a57d01213cbe3ec1ebac3eec77d",
    });
    const value = decodeHeader(encodedHeader);

    expect(value).toEqual({
      fid: 341794,
      type: "custody",
      key: "0x78397d9d185d3a57d01213cbe3ec1ebac3eec77d",
    });
  });
});

describe("decodePayload", () => {
  it("decodes payload", () => {
    const encodedPayload = encodePayload(
      constructJSONFarcasterSignatureAccountAssociationPaylod("example.com")
    );
    const value = decodePayload(encodedPayload);

    expect(value).toEqual({
      domain: "example.com",
    });
  });
});

describe("encodeSignature", () => {
  it("encodes signature", () => {
    const value = encodeSignature("0x0000000");

    expect(typeof value).toBe("string");
  });
});

describe("decodeSignature", () => {
  it("decodes signature", () => {
    const encodedSignature = encodeSignature("0x0000000");
    const value = decodeSignature(encodedSignature);

    expect(value).toBe("0x0000000");
  });
});
