import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SEGMENT_SEPARATOR = ".";

// Il segreto va fornito come stringa a 32 caratteri (vedi .env.example), ma viene comunque
// derivato via SHA-256 in una chiave a 32 byte: rende la cifratura robusta anche se il valore
// fornito non è esattamente 32 byte una volta codificato in UTF-8.
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET is not set");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext]
    .map((buffer) => buffer.toString("base64"))
    .join(SEGMENT_SEPARATOR);
}

export function decrypt(payload: string): string {
  const key = getEncryptionKey();
  const [ivB64, authTagB64, ciphertextB64] = payload.split(SEGMENT_SEPARATOR);

  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
