"use client";

const ENC_MARKER = "enc:v1:";
const KEY_CACHE = new Map<string, Promise<CryptoKey>>();

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

function keyMaterial(chatId: string, memberIds: string[]): string {
  const sorted = [...memberIds].sort();
  return `impulse::${chatId}::${sorted.join("|")}`;
}

async function deriveKey(material: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(material),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("impulse-e2e-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function getKey(chatId: string, memberIds: string[]): Promise<CryptoKey> {
  const cacheKey = `${chatId}:${memberIds.slice().sort().join(",")}`;
  const cached = KEY_CACHE.get(cacheKey);
  if (cached) return cached;
  const promise = deriveKey(keyMaterial(chatId, memberIds));
  KEY_CACHE.set(cacheKey, promise);
  return promise;
}

export async function encryptText(
  plaintext: string,
  chatId: string,
  memberIds: string[]
): Promise<string> {
  if (!plaintext) return plaintext;
  try {
    const key = await getKey(chatId, memberIds);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(plaintext)
    );
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return ENC_MARKER + bytesToHex(combined);
  } catch {
    return plaintext;
  }
}

export async function decryptText(
  ciphertext: string | null,
  chatId: string,
  memberIds: string[]
): Promise<string> {
  if (!ciphertext) return "";
  if (!ciphertext.startsWith(ENC_MARKER)) return ciphertext;
  try {
    const key = await getKey(chatId, memberIds);
    const hex = ciphertext.slice(ENC_MARKER.length);
    const combined = hexToBytes(hex);
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return "🔒 Сообщение";
  }
}

export function isEncrypted(text: string | null): boolean {
  return Boolean(text && text.startsWith(ENC_MARKER));
}
