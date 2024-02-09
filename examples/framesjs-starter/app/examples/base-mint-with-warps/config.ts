export const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_HOST;
export const ALLOWED_ORIGIN = new URL(NEXT_PUBLIC_URL!).host;
export const SYNDICATE_API_KEY = process.env.SYNDICATE_API_KEY;
export const TOKEN_IMAGE = `${NEXT_PUBLIC_URL}/horse.png`;
export const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;
export const MINTER_CONTRACT = process.env.MINTER_CONTRACT;

export const ZORA_COLLECTION_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
export const ZORA_TOKEN_ID = "1";
export const ZORA_COLLECTION_NAME = "Example Collection";
export const ZORA_COLLECTION_IMAGE = `${NEXT_PUBLIC_URL}/horse.png`;
