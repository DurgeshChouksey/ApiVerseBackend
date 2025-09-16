// helper to hash the provider key to 256-bit using SHA-256
async function deriveKey(rawKey: string) {
    const enc = new TextEncoder();
    const keyData = enc.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
    return hashBuffer; // 32 bytes
}

function toHex(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hexString: string): Uint8Array {
    const length = hexString.length / 2;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes;
}

export async function encrypt(text: string, rawKey?: string) {
    const keyBuffer = await deriveKey(rawKey || "32_characters_minimum_for_AES_256!!");
    const key = await crypto.subtle.importKey(
        "raw",
        keyBuffer,
        "AES-GCM",
        false,
        ["encrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encodedText = enc.encode(text);

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedText
    );

    return `${toHex(iv)}:${toHex(encrypted)}`;
}

export async function decrypt(encryptedString: string, rawKey?: string) {
    const [ivHex, dataHex] = encryptedString.split(":");
    const iv = fromHex(ivHex);
    const data = fromHex(dataHex);

    const keyBuffer = await deriveKey(rawKey || "32_characters_minimum_for_AES_256!!");
    const key = await crypto.subtle.importKey(
        "raw",
        keyBuffer,
        "AES-GCM",
        false,
        ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
}
