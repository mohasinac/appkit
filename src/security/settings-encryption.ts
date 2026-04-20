// crypto is a Node.js built-in. Use require() to keep it out of the static
// import graph so Next.js Edge bundler does not warn about this file.
/* eslint-disable @typescript-eslint/no-require-imports */
function nodeCrypto() { return require("crypto") as typeof import("crypto"); }
/* eslint-enable @typescript-eslint/no-require-imports */

const ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES = 12;
const PREFIX = "enc:v1:";

function getMasterKey(): Buffer {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).",
    );
  }

  return Buffer.from(hex, "hex");
}

export function encryptSecret(plaintext: string): string {
  const key = getMasterKey();
  const { randomBytes, createCipheriv } = nodeCrypto();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decryptSecret(encrypted: string): string {
  if (!encrypted.startsWith(PREFIX)) {
    return encrypted;
  }

  const parts = encrypted.slice(PREFIX.length).split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value - expected 3 parts");
  }

  const [ivB64, tagB64, ciphertextB64] = parts;
  const { createDecipheriv } = nodeCrypto();
  const decipher = createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function isSecretEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function maskSecret(value: string): string {
  if (!value || value.length < 12) {
    return "****";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
