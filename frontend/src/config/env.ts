import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url({ message: "NEXT_PUBLIC_API_URL must be a valid URL" })
    .optional(),
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
  NEXT_PUBLIC_AUTH_MODE: z
    .enum(["dev", "firebase"])
    .default("dev"),
  // Firebase configuration
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parseEnv = () => {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_USE_MOCK_API: process.env.NEXT_PUBLIC_USE_MOCK_API,
    NEXT_PUBLIC_MOCK_SCENARIO: process.env.NEXT_PUBLIC_MOCK_SCENARIO,
    NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    console.error("Invalid environment configuration:", result.error.format());
    throw new Error("Invalid environment configuration. Check your .env file.");
  }

  const apiUrl =
    result.data.NEXT_PUBLIC_API_URL ||
    result.data.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000/api/v1";

  return {
    API_BASE_URL: apiUrl,
    API_URL: apiUrl,
    USE_MOCK_API: result.data.NEXT_PUBLIC_USE_MOCK_API,
    MOCK_SCENARIO: result.data.NEXT_PUBLIC_MOCK_SCENARIO,
    AUTH_MODE: result.data.NEXT_PUBLIC_AUTH_MODE,
    FIREBASE: {
      apiKey: result.data.NEXT_PUBLIC_FIREBASE_API_KEY || "",
      authDomain: result.data.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
      projectId: result.data.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
      storageBucket: result.data.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: result.data.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: result.data.NEXT_PUBLIC_FIREBASE_APP_ID || "",
      measurementId: result.data.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
    },
    IS_DEV: result.data.NODE_ENV === "development",
    IS_PROD: result.data.NODE_ENV === "production",
    IS_TEST: result.data.NODE_ENV === "test",
  };
};

export const env = parseEnv();
