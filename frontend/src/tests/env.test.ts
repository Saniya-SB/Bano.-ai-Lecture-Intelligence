import { describe, it, expect } from "vitest";
import { env } from "@/config/env";

describe("env configuration validation", () => {
  it("provides valid defaults for API base URL and mock toggle", () => {
    expect(env.API_BASE_URL).toBeDefined();
    expect(typeof env.USE_MOCK_API).toBe("boolean");
    expect(["default", "empty", "slow", "errors", "benchmark-sample"]).toContain(
      env.MOCK_SCENARIO
    );
  });

  it("exposes boolean environment flags without secrets", () => {
    expect(typeof env.IS_DEV).toBe("boolean");
    expect(typeof env.IS_PROD).toBe("boolean");
    expect(typeof env.IS_TEST).toBe("boolean");
  });
});
