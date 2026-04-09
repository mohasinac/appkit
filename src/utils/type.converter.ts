/**
 * Data Type Converters
 */

export function stringToBoolean(value: string): boolean {
  return ["true", "yes", "1", "on"].includes(value.toLowerCase());
}

export function booleanToString(
  value: boolean,
  format: "yesno" | "truefalse" | "onoff" = "truefalse",
): string {
  const formats = {
    yesno: { true: "Yes", false: "No" },
    truefalse: { true: "True", false: "False" },
    onoff: { true: "On", false: "Off" },
  };
  return formats[format][value.toString() as "true" | "false"];
}

export function arrayToObject<T>(
  arr: T[],
  keyField: keyof T,
): Record<string, T> {
  return arr.reduce(
    (acc, item) => {
      const key = String(item[keyField]);
      acc[key] = item;
      return acc;
    },
    {} as Record<string, T>,
  );
}

export function objectToArray<T>(obj: Record<string, T>): T[] {
  return Object.values(obj);
}

export function queryStringToObject(
  queryString: string,
): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function objectToQueryString(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

export function firestoreTimestampToDate(
  timestamp: { toDate?: () => Date; seconds?: number } | unknown,
): Date {
  if (
    timestamp &&
    typeof timestamp === "object" &&
    "toDate" in timestamp &&
    typeof (timestamp as { toDate: () => Date }).toDate === "function"
  ) {
    return (timestamp as { toDate: () => Date }).toDate();
  }
  if (
    timestamp &&
    typeof timestamp === "object" &&
    "seconds" in timestamp &&
    typeof (timestamp as { seconds: number }).seconds === "number"
  ) {
    return new Date((timestamp as { seconds: number }).seconds * 1000);
  }
  return new Date(timestamp as string | number);
}

export function dateToISOString(date: Date | string): string {
  return typeof date === "string"
    ? new Date(date).toISOString()
    : date.toISOString();
}
