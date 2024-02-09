// import { ZDK, ZDKNetwork, ZDKChain } from "@zoralabs/zdk";
import {
  NEXT_PUBLIC_URL,
  ZORA_COLLECTION_ADDRESS,
  ZORA_TOKEN_ID,
  ZORA_API_KEY,
} from "../config";
// import { TokenQuery } from "@zoralabs/zdk/dist/queries/queries-sdk";

// const networkInfo = {
//   network: ZDKNetwork.Base,
//   chain: ZDKChain.BaseMainnet,
// };

// const API_ENDPOINT = "https://api.zora.co/graphql";
// const args = {
//   endPoint: API_ENDPOINT,
//   networks: [networkInfo],
//   apiKey: ZORA_API_KEY,
// };

// const zdk = new ZDK(args);

export async function getCollection() {
  // try {
  //   collection = await zdk.token({
  //     token: { address: ZORA_COLLECTION_ADDRESS, tokenId: ZORA_TOKEN_ID },
  //     includeFullDetails: false,
  //   });
  // } catch (error: any) {
  //   console.warn(
  //     "Error fetching collection",
  //     error.toString().slice(0, 100),
  //     "..."
  //   );
  // }

  const name = "Example Collection";
  const image = `${NEXT_PUBLIC_URL}/horse.png`;
  //collection.token?.token.image?.mediaEncoding?.original ?? `${NEXT_PUBLIC_URL}/giraffe.png`;
  return {
    name,
    image,
    address: ZORA_COLLECTION_ADDRESS,
    tokenId: ZORA_TOKEN_ID,
  };
}
