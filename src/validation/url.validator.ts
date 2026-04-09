/**
 * URL Validation Utilities
 */

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidUrlWithProtocol(
  url: string,
  protocols: string[] = ["http", "https"],
): boolean {
  if (!isValidUrl(url)) return false;
  try {
    const urlObj = new URL(url);
    return protocols.includes(urlObj.protocol.replace(":", ""));
  } catch {
    return false;
  }
}

export function isExternalUrl(url: string, currentDomain?: string): boolean {
  if (!isValidUrl(url)) return false;
  try {
    const urlObj = new URL(url);
    const currentHost =
      currentDomain ||
      (typeof window !== "undefined" ? window.location.hostname : "");
    return urlObj.hostname !== currentHost;
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  const dangerousProtocols = ["javascript:", "data:", "vbscript:"];
  for (const protocol of dangerousProtocols) {
    if (url.toLowerCase().startsWith(protocol)) return "about:blank";
  }
  return url;
}
