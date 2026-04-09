/**
 * Object Data Helpers
 *
 * Generic helpers for object data operations — no external dependencies.
 */

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const output = { ...target };
  Object.keys(source).forEach((key) => {
    const sourceValue = source[key as keyof T];
    const targetValue = target[key as keyof T];
    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      output[key as keyof T] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Partial<Record<string, unknown>>,
      ) as T[keyof T];
    } else {
      output[key as keyof T] = sourceValue as T[keyof T];
    }
  });
  return output;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

export function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj))
    return obj.map((item) => deepClone(item)) as unknown as T;
  const cloned = {} as T;
  const objectRecord = obj as Record<string, unknown>;
  Object.keys(objectRecord).forEach((key) => {
    cloned[key as keyof T] = deepClone(objectRecord[key]) as T[keyof T];
  });
  return cloned;
}

export function isEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  if (
    typeof obj1 !== "object" ||
    typeof obj2 !== "object" ||
    obj1 === null ||
    obj2 === null
  ) {
    return false;
  }
  const first = obj1 as Record<string, unknown>;
  const second = obj2 as Record<string, unknown>;
  const keys1 = Object.keys(first);
  const keys2 = Object.keys(second);
  if (keys1.length !== keys2.length) return false;
  return keys1.every((key) => isEqual(first[key], second[key]));
}

export function cleanObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    removeEmpty?: boolean;
    removeNull?: boolean;
    removeUndefined?: boolean;
  } = {},
): Partial<T> {
  const {
    removeEmpty = true,
    removeNull = true,
    removeUndefined = true,
  } = options;
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const shouldRemove =
      (removeUndefined && value === undefined) ||
      (removeNull && value === null) ||
      (removeEmpty && value === "");
    if (!shouldRemove) acc[key as keyof T] = value as T[keyof T];
    return acc;
  }, {} as Partial<T>);
}
