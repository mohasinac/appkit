/**
 * Cookie Utilities — client-side only (browser environment)
 */

export function parseCookies(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const result: Record<string, string> = {};
  for (const cookie of document.cookie.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name) result[name.trim()] = decodeURIComponent(valueParts.join("="));
  }
  return result;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const cookie of document.cookie.split(";")) {
    const [cookieName, ...valueParts] = cookie.trim().split("=");
    if (cookieName?.trim() === name)
      return decodeURIComponent(valueParts.join("="));
  }
  return null;
}

export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

export function deleteCookie(name: string, path: string = "/"): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
}
