import {
  ZORA_COLLECTION_ADDRESS,
  ZORA_COLLECTION_IMAGE,
  ZORA_COLLECTION_NAME,
  ZORA_TOKEN_ID,
} from "../config";

export async function getCollection() {
  return {
    name: ZORA_COLLECTION_NAME,
    image: ZORA_COLLECTION_IMAGE,
    address: ZORA_COLLECTION_ADDRESS,
    tokenId: ZORA_TOKEN_ID,
  };
}
