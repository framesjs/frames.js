import type { Abi, TypedData, TypedDataDomain } from "viem";
import { z } from "zod";

export type TransactionResponse =
  | TransactionResponseSuccess
  | TransactionResponseFailure;

export type TransactionResponseSuccess = {
  jsonrpc: "2.0";
  id: string | number | null;
  result: TransactionSuccessBody;
};

export type TransactionSuccessBody =
  | EthSendTransactionSuccessBody
  | EthSignTypedDataV4SuccessBody;

export type EthSendTransactionSuccessBody = {
  address: `0x${string}`;
  transactionHash: `0x${string}`;
};

export type EthSignTypedDataV4SuccessBody = {
  address: `0x${string}`;
  signature: `0x${string}`;
};

export type TransactionResponseFailure = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
  };
};

export type CreateCastResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result: {
    success: true;
  };
};

export type MiniAppResponse = TransactionResponse | CreateCastResponse;

const createCastRequestSchemaLegacy = z.object({
  type: z.literal("createCast"),
  data: z.object({
    cast: z.object({
      parent: z.string().optional(),
      text: z.string(),
      embeds: z.array(z.string().min(1).url()).min(1),
    }),
  }),
});

export type CreateCastLegacyMessage = z.infer<
  typeof createCastRequestSchemaLegacy
>;

const createCastRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]),
  method: z.literal("fc_createCast"),
  params: z.object({
    cast: z.object({
      parent: z.string().optional(),
      text: z.string(),
      embeds: z.array(z.string().min(1).url()).min(1),
    }),
  }),
});

export type CreateCastMessage = z.infer<typeof createCastRequestSchema>;

const ethSendTransactionActionSchema = z.object({
  chainId: z.string(),
  method: z.literal("eth_sendTransaction"),
  attribution: z.boolean().optional(),
  params: z.object({
    abi: z.custom<Abi>(),
    to: z.custom<`0x${string}`>(
      (val): val is `0x${string}` =>
        typeof val === "string" && val.startsWith("0x")
    ),
    value: z.string().optional(),
    data: z
      .custom<`0x${string}`>((val): val is `0x${string}` => typeof val === "string" && val.startsWith("0x"))
      .optional(),
  }),
});

export type EthSendTransactionAction = z.infer<
  typeof ethSendTransactionActionSchema
>;

const ethSignTypedDataV4ActionSchema = z.object({
  chainId: z.string(),
  method: z.literal("eth_signTypedData_v4"),
  params: z.object({
    domain: z.custom<TypedDataDomain>(),
    types: z.custom<TypedData>((value) => {
      const result = z.record(z.unknown()).safeParse(value);

      return result.success;
    }),
    primaryType: z.string(),
    message: z.record(z.unknown()),
  }),
});

export type EthSignTypedDataV4Action = z.infer<
  typeof ethSignTypedDataV4ActionSchema
>;

const walletActionRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.string(),
  method: z.literal("fc_requestWalletAction"),
  params: z.object({
    action: z.union([
      ethSendTransactionActionSchema,
      ethSignTypedDataV4ActionSchema,
    ]),
  }),
});

export type RequestWalletActionMessage = z.infer<
  typeof walletActionRequestSchema
>;

export const miniAppMessageSchema = z.union([
  createCastRequestSchemaLegacy,
  walletActionRequestSchema,
  createCastRequestSchema,
]);

export type MiniAppMessage = z.infer<typeof miniAppMessageSchema>;
