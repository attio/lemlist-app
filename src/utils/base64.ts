const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

function encodeBytesToBase64(bytes: Uint8Array): string {
    let output = ""

    for (let i = 0; i < bytes.length; i += 3) {
        const byte1 = bytes[i] ?? 0
        const hasByte2 = i + 1 < bytes.length
        const hasByte3 = i + 2 < bytes.length
        const byte2 = hasByte2 ? (bytes[i + 1] ?? 0) : 0
        const byte3 = hasByte3 ? (bytes[i + 2] ?? 0) : 0

        const triplet = (byte1 << 16) | (byte2 << 8) | byte3

        output += BASE64_ALPHABET[(triplet >> 18) & 0x3f]
        output += BASE64_ALPHABET[(triplet >> 12) & 0x3f]
        output += hasByte2 ? BASE64_ALPHABET[(triplet >> 6) & 0x3f] : "="
        output += hasByte3 ? BASE64_ALPHABET[triplet & 0x3f] : "="
    }

    return output
}

/**
 * Encodes a UTF-8 string as standard Base64.
 */
export function encodeBase64(value: string): string {
    const bytes = new TextEncoder().encode(value)
    return encodeBytesToBase64(bytes)
}
