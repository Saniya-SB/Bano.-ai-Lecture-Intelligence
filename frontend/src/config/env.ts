import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url({ message: "NEXT_PUBLIC_API_BASE_URL must be a valid URL" })
    .default("http://localhost:8000/api/v1"),
  NEXT_PUBLIC_USE_MOCK_API: z
    .enum(["true", "false"])
    .default("true")
    .transform((val) => val === "true"),
  NEXT_PUBLIC_MOCK_SCENARIO: z
    .enum(["default", "empty", "slow", "errors", "benchmark-sample"])
    .default("default"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parseEnv = () => {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_USE_MOCK_API: process.env.NEXT_PUBLIC_USE_MOCK_API,
    NEXT_PUBLIC_MOCK_SCENARIO: process.env.NEXT_PUBLIC_MOCK_SCENARIO,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    console.error("Invalid environment configuration:", result.error.format());
    throw new Error("Invalid environment configuration. Check your .env file.");
  }

  return {
    API_BASE_URL: result.data.NEXT_PUBLIC_API_BASE_URL,
    USE_MOCK_API: result.data.NEXT_PUBLIC_USE_MOCK_API,
    MOCK_SCENARIO: result.data.NEXT_PUBLIC_MOCK_SCENARIO,
    IS_DEV: result.data.NODE_ENV === "development",
    IS_PROD: result.data.NODE_ENV === "production",
    IS_TEST: result.data.NODE_ENV === "test",
  };
};

export const env = parseEnv();
