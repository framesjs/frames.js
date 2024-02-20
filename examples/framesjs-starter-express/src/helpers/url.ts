/* Example usage:
const decodedObject = {
p: '/',
s: '{"active":"1","total_button_presses":0}',
r: '{}'
};
const encodedString2 = encodeString(decodedObject);
console.log('Encoded string:', encodedString2);*/

export function encodeString(obj: Record<string, any>): string {
    // Convert the object to a query string
    const queryString = Object.entries(obj)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
  
    return queryString;
}



/* Example usage:
const encodedString = 'p=%2F&s=%7B%22active%22%3A%221%22%2C%22total_button_presses%22%3A0%7D&r=%7B%7D';
const decodedString = decodeString(encodedString);
console.log('Decoded string:', decodedString);*/

export function decodeString(str: string): string {
    // Decode the provided string
    const decodedString = decodeURIComponent(str.replace(/\+/g, ' '));
  
    return decodedString;
}