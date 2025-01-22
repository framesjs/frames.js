/* eslint-disable @typescript-eslint/no-unsafe-assignment -- for expect.any() */
import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import type { Hex } from "viem";
import { bytesToHex, hexToBytes } from "viem";
import {
  sign,
  verify,
  verifyCompact,
  encodeHeader,
  encodePayload,
  encodeSignature,
  decodeHeader,
  decodePayload,
  decodeCustodyTypeSignature,
  decodeAppKeyTypeSignature,
  constructJSONFarcasterSignatureAccountAssociationPaylod,
  signMessageWithAppKey,
} from "./json-signature";

process.env.NEYNAR_API_KEY = "NEYNAR_FRAMES_JS";

ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

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

const custodySignatures = [framesJsDemoSignature, fcDemoSignature];

const dummyAppKeySignature = {
  header:
    "eyJmaWQiOjM0MTc5NCwidHlwZSI6ImFwcF9rZXkiLCJrZXkiOiIweGJkZGVhNDQ2ODUxZDYwZjQ4OTAxNjU1NDc4YTIwNTQ3MmNjOTJmNGUwMzdiNTIzNmE1YzVhYmZjMWI4ZTA5MWIifQ",
  payload: "eyJ0ZXN0Ijp0cnVlfQ",
  signature:
    "Y1C9-m6EIAPDqd8-2NrSXBKrpvWKUfA3Qjy865De5yUu7MV_b1TjsQKtwqbaVv_UzFz5ghmvygVbGjhx-kbRDw",
};

const dummyAppKeyCompactSignature = `${dummyAppKeySignature.header}.${dummyAppKeySignature.payload}.${dummyAppKeySignature.signature}`;
const appKeySignatures = [dummyAppKeySignature];

const custodyCompactSignatures = [
  framesJsDemoCompactSignature,
  fcDemoCompactSignature,
];
const appKeyCompactSignatures = [dummyAppKeyCompactSignature];

describe("verifyCompact", () => {
  describe("custody", () => {
    it.each(custodyCompactSignatures)(
      "verifies valid message",
      async (signature) => {
        await expect(verifyCompact(signature)).resolves.toBe(true);
      }
    );
  });

  describe("app_key", () => {
    it.each(appKeyCompactSignatures)(
      "verifies valid message",
      async (signature) => {
        await expect(verifyCompact(signature)).resolves.toBe(true);
      }
    );
  });
});

describe("verify", () => {
  describe("custody", () => {
    it.each(custodySignatures)("verifies valid message", async (signature) => {
      await expect(verify(signature)).resolves.toBe(true);
    });
  });

  describe("app_key", () => {
    it.each(appKeySignatures)("verifies valid message", async (signature) => {
      await expect(verify(signature)).resolves.toBe(true);
    });
  });
});

describe("sign", () => {
  describe("custody", () => {
    it("signs any payload", async () => {
      const signature = await sign({
        fid: 1,
        payload: { test: true },
        signer: {
          type: "custody",
          custodyAddress: "0x1234567890abcdef1234567890abcdef12345678",
        },
        signMessage: (message) => {
          expect(typeof message === "string").toBe(true);
          expect(message.length).toBeGreaterThan(0);

          return Promise.resolve("0x0000000");
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
      expect(decodeCustodyTypeSignature(signature.json.signature)).toEqual(
        "0x0000000"
      );
    });
  });

  describe("app_key", () => {
    it("signs any payload", async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      let messageSignature: Hex = "0x";
      const signature = await sign({
        fid: 1,
        payload: { test: true },
        signer: {
          type: "app_key",
          appKey: bytesToHex(ed25519.getPublicKey(privateKey)),
        },
        signMessage: (message) => {
          expect(typeof message === "string").toBe(true);
          expect(message.length).toBeGreaterThan(0);

          messageSignature = bytesToHex(
            ed25519.sign(Buffer.from(message, "utf-8"), privateKey)
          );

          return Promise.resolve(messageSignature);
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

      expect(Buffer.from(signature.json.signature, "base64url")).toHaveProperty(
        "byteLength",
        64
      );
      expect(decodePayload(signature.json.payload)).toEqual({ test: true });
      expect(decodeHeader(signature.json.header)).toEqual({
        fid: 1,
        type: "app_key",
        key: bytesToHex(ed25519.getPublicKey(privateKey)),
      });
      expect(decodeAppKeyTypeSignature(signature.json.signature)).toEqual(
        messageSignature
      );
    });
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
    const input = "0x0000000";
    const value = encodeSignature(Buffer.from("0x0000000", "utf-8"));

    expect(typeof value).toBe("string");
    expect(Buffer.from(input, "utf-8").toString("base64url")).toEqual(value);
  });

  it("encodes signature as Buffer", () => {
    const input = hexToBytes("0x0000001");
    const value = encodeSignature(Buffer.from(input));

    expect(Buffer.from(input).toString("base64url")).toEqual(value);
  });
});

describe("decodeAppKeyTypeSignature", () => {
  it("decodes signature (string)", () => {
    const buf = Buffer.from("0x0000000", "utf-8");
    const encodedSignature = encodeSignature(buf);
    const value = decodeAppKeyTypeSignature(encodedSignature);

    expect(value).toBe(bytesToHex(buf));
  });

  it("decodes signature (from buffer)", () => {
    const input = hexToBytes("0x0000001");
    const encodedSignature = encodeSignature(Buffer.from(input));
    const value = decodeAppKeyTypeSignature(encodedSignature);

    expect(value).toBe(bytesToHex(input));
  });
});

describe("decodeCustodyTypeSignature", () => {
  it("decodes signature (string)", () => {
    const buf = Buffer.from("0x0000000", "utf-8");
    const encodedSignature = encodeSignature(buf);
    const value = decodeCustodyTypeSignature(encodedSignature);

    expect(value).toBe(buf.toString("utf-8"));
  });

  it("decodes signature (from buffer)", () => {
    const input = "0x0000001";
    const encodedSignature = encodeSignature(Buffer.from(input, "utf-8"));
    const value = decodeCustodyTypeSignature(encodedSignature);

    expect(value).toBe(input);
  });
});

describe("signMessageWithAppKey", () => {
  it("signs any payload", async () => {
    const privateKey = ed25519.utils.randomPrivateKey();
    const signature = await sign({
      fid: 1,
      payload: { test: true },
      signer: {
        type: "app_key",
        appKey: bytesToHex(ed25519.getPublicKey(privateKey)),
      },
      signMessage: signMessageWithAppKey(privateKey),
    });

    expect(signature).toMatchObject({
      compact: expect.any(String),
      json: {
        header: expect.any(String),
        payload: expect.any(String),
        signature: expect.any(String),
      },
    });
  });
});
