import { describe, it, expect } from "vitest";
import { parseErrorResponse } from "@/services/api-client";

describe("api-client error normaliser", () => {
  it("normalises 400 and 422 to validation error kind", () => {
    const res400 = parseErrorResponse(400, { message: "Invalid email" });
    expect(res400.kind).toBe("validation");
    expect(res400.userMessage).toBe("Invalid email");

    const res422 = parseErrorResponse(422, {
      detail: [{ loc: ["body", "password"], msg: "Password too short" }],
    });
    expect(res422.kind).toBe("validation");
    expect(res422.fieldErrors?.password).toBe("Password too short");
  });

  it("normalises 401 to unauthorized kind", () => {
    const res = parseErrorResponse(401, null);
    expect(res.kind).toBe("unauthorized");
  });

  it("normalises 403 to forbidden kind", () => {
    const res = parseErrorResponse(403, null);
    expect(res.kind).toBe("forbidden");
  });

  it("normalises 404 to not-found kind", () => {
    const res = parseErrorResponse(404, null);
    expect(res.kind).toBe("not-found");
  });

  it("normalises 409 to conflict kind", () => {
    const res = parseErrorResponse(409, null);
    expect(res.kind).toBe("conflict");
  });

  it("normalises 429 to rate-limited kind", () => {
    const res = parseErrorResponse(429, null);
    expect(res.kind).toBe("rate-limited");
  });

  it("normalises 500/503 to server kind", () => {
    const res500 = parseErrorResponse(500, null);
    expect(res500.kind).toBe("server");

    const res503 = parseErrorResponse(503, null);
    expect(res503.kind).toBe("server");
  });

  it("extracts requestId when provided", () => {
    const res = parseErrorResponse(500, { request_id: "req_xyz_123" });
    expect(res.requestId).toBe("req_xyz_123");
  });
});
