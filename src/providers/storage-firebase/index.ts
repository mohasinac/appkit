/**
 * @mohasinac/storage-firebase
 *
 * Firebase Storage (Admin SDK) implementation of `IStorageProvider`
 * from `@mohasinac/contracts`.
 *
 * @example
 * ```ts
 * import { firebaseStorageProvider } from "@mohasinac/storage-firebase";
 *
 * const result = await firebaseStorageProvider.upload(
 *   buffer, "products/image.jpg", { contentType: "image/jpeg" }
 * );
 * ```
 */

export { firebaseStorageProvider } from "./provider";
