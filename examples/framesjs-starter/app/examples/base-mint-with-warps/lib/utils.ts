import { getAddressForFid } from 'frames.js';

export async function getAddressWithTypeForFid(fid: number) {
  const [verifiedOrNull, verifiedOrCustody] = await Promise.all([
    getAddressForFid({
      fid,
      options: {
        fallbackToCustodyAddress: false,
      },
    }),
    getAddressForFid({
      fid,
      options: {
        fallbackToCustodyAddress: true,
      },
    }),
  ]);
  const isCustody = verifiedOrNull === null;
  const address = verifiedOrCustody;

  return {
    address,
    isCustody: isCustody,
  };
}

export function isPrime(n: number) {
  if (n <= 1) {
    return false;
  }
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      return false;
    }
  }
  return true;
}
