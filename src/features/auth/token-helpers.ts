function getCryptoApi(): Crypto {
  if (!globalThis.crypto) {
    throw new Error("Crypto API is not available in this runtime");
  }

  return globalThis.crypto;
}

export function generateVerificationToken(): string {
  return getCryptoApi().randomUUID();
}

export function generateVerificationCode(): string {
  const array = new Uint32Array(1);
  getCryptoApi().getRandomValues(array);
  return ((array[0] % 900000) + 100000).toString();
}

export function calculateTokenExpiration(hoursFromNow: number = 24): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + hoursFromNow);
  return expiration;
}

export function isTokenExpired(expiresAt: Date | string): boolean {
  const expiry =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return expiry.getTime() < Date.now();
}

export function getTokenTimeRemaining(expiresAt: Date | string): number {
  const expiry =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const remaining = expiry.getTime() - Date.now();
  return Math.max(0, Math.floor(remaining / 60000));
}

export function maskToken(token: string): string {
  if (token.length <= 8) {
    return token;
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export function generateSessionId(): string {
  return generateVerificationToken();
}
