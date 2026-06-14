import { describe, expect, it } from "vitest";
import { mapToHttpError, HTTP_ERROR_CODES } from "../error-mapping";
import { ApiError } from "../api-error";
import { ValidationError } from "../validation-error";
import { AuthenticationError } from "../authentication-error";
import { AuthorizationError } from "../authorization-error";
import { NotFoundError } from "../not-found-error";
import { DatabaseError } from "../database-error";
import { RazorpayUnreachableError } from "../razorpay-unreachable";

describe("mapToHttpError", () => {
  describe("AppError subclasses", () => {
    it("maps ValidationError → 400 VALIDATION_FAILED", () => {
      const r = mapToHttpError(new ValidationError("bad email"));
      expect(r.status).toBe(400);
      expect(r.code).toBe(HTTP_ERROR_CODES.VALIDATION_FAILED);
      expect(r.message).toBe("bad email");
    });

    it("maps AuthenticationError → 401 UNAUTHENTICATED", () => {
      const r = mapToHttpError(new AuthenticationError("nope"));
      expect(r.status).toBe(401);
      expect(r.code).toBe(HTTP_ERROR_CODES.UNAUTHENTICATED);
    });

    it("maps AuthorizationError → 403 FORBIDDEN", () => {
      const r = mapToHttpError(new AuthorizationError("denied"));
      expect(r.status).toBe(403);
      expect(r.code).toBe(HTTP_ERROR_CODES.FORBIDDEN);
    });

    it("maps NotFoundError → 404 NOT_FOUND", () => {
      const r = mapToHttpError(new NotFoundError("missing"));
      expect(r.status).toBe(404);
      expect(r.code).toBe(HTTP_ERROR_CODES.NOT_FOUND);
    });

    it("maps RazorpayUnreachableError → 503 UPSTREAM_UNAVAILABLE", () => {
      const r = mapToHttpError(new RazorpayUnreachableError("network"));
      expect(r.status).toBe(503);
      expect(r.code).toBe(HTTP_ERROR_CODES.UPSTREAM_UNAVAILABLE);
    });

    it("maps ApiError → its declared status + code", () => {
      const r = mapToHttpError(new ApiError(418, "teapot"));
      expect(r.status).toBe(418);
      expect(r.code).toBe("API_ERROR");
      expect(r.message).toBe("teapot");
    });
  });

  describe("DatabaseError wrapping FirestoreError", () => {
    it("unwraps numeric FirestoreError 5 → 404 NOT_FOUND", () => {
      const dbErr = new DatabaseError("doc missing", { code: 5, message: "not-found" });
      const r = mapToHttpError(dbErr);
      expect(r.status).toBe(404);
      expect(r.code).toBe(HTTP_ERROR_CODES.NOT_FOUND);
    });

    it("unwraps numeric FirestoreError 7 → 403 PERMISSION_DENIED", () => {
      const r = mapToHttpError(new DatabaseError("denied", { code: 7 }));
      expect(r.status).toBe(403);
      expect(r.code).toBe(HTTP_ERROR_CODES.PERMISSION_DENIED);
    });

    it("unwraps numeric FirestoreError 10 → 409 CONCURRENT_MODIFICATION", () => {
      const r = mapToHttpError(new DatabaseError("aborted", { code: 10 }));
      expect(r.status).toBe(409);
      expect(r.code).toBe(HTTP_ERROR_CODES.CONCURRENT_MODIFICATION);
    });

    it("falls back to 500 DATABASE_ERROR when inner cause is not FirestoreError", () => {
      const r = mapToHttpError(new DatabaseError("disk full", undefined));
      expect(r.status).toBe(500);
    });
  });

  describe("bare FirestoreError-shaped objects", () => {
    it("maps numeric code 7 → 403 PERMISSION_DENIED", () => {
      const r = mapToHttpError({ code: 7, message: "permission-denied" });
      expect(r.status).toBe(403);
      expect(r.code).toBe(HTTP_ERROR_CODES.PERMISSION_DENIED);
    });

    it("maps string code permission-denied → 403", () => {
      const r = mapToHttpError({ code: "permission-denied", message: "no" });
      expect(r.status).toBe(403);
      expect(r.code).toBe(HTTP_ERROR_CODES.PERMISSION_DENIED);
    });
  });

  describe("Zod-shaped errors", () => {
    it("maps Zod-like { issues } → 400 VALIDATION_FAILED with issues", () => {
      const r = mapToHttpError({ issues: [{ path: ["email"], message: "bad" }] });
      expect(r.status).toBe(400);
      expect(r.code).toBe(HTTP_ERROR_CODES.VALIDATION_FAILED);
      expect(r.issues).toHaveLength(1);
    });
  });

  describe("Unknown errors", () => {
    it("scrubs in production mode", () => {
      const r = mapToHttpError(new Error("DB password=secret"), {
        isProduction: true,
      });
      expect(r.status).toBe(500);
      expect(r.message).toBe("An internal error occurred");
    });

    it("preserves message in dev mode", () => {
      const r = mapToHttpError(new Error("specific dev message"));
      expect(r.status).toBe(500);
      expect(r.message).toBe("specific dev message");
    });

    it("handles string throws", () => {
      const r = mapToHttpError("oops");
      expect(r.status).toBe(500);
      expect(r.message).toBe("oops");
    });

    it("handles undefined throws", () => {
      const r = mapToHttpError(undefined);
      expect(r.status).toBe(500);
    });
  });

  describe("Legacy { status } objects", () => {
    it("maps { status: 401 } → 401 UNAUTHENTICATED", () => {
      const r = mapToHttpError({ status: 401, message: "auth" });
      expect(r.status).toBe(401);
      expect(r.code).toBe(HTTP_ERROR_CODES.UNAUTHENTICATED);
    });

    it("maps { statusCode: 404 } → 404 NOT_FOUND", () => {
      const r = mapToHttpError({ statusCode: 404, message: "gone" });
      expect(r.status).toBe(404);
      expect(r.code).toBe(HTTP_ERROR_CODES.NOT_FOUND);
    });
  });
});
