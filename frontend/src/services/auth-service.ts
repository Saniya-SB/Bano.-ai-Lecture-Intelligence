import { signInWithPopup, signOut } from "firebase/auth";
import { env } from "@/config/env";
import { apiClient } from "./api-client";
import { UserDto } from "@/types/api/common";
import { User } from "@/types/domain/common";
import { mapUserDtoToDomain } from "./adapters/common-adapter";
import { authManager } from "./auth-provider";
import { getFirebaseAuth, getGoogleAuthProvider } from "@/lib/firebase";

export const authService = {
  /**
   * Fetches the current authenticated user from GET /api/v1/users/me.
   */
  async getCurrentUser(): Promise<User | null> {
    const token = await authManager.getValidToken();
    if (!token && !env.USE_MOCK_API) {
      return null;
    }

    try {
      const dto = await apiClient<UserDto>("/users/me");
      return mapUserDtoToDomain(dto);
    } catch {
      return null;
    }
  },

  async updateProfile(data: { fullName: string }): Promise<User> {
    const currentSession = authManager.getSession();
    if (currentSession && env.AUTH_MODE === "dev") {
      authManager.setDevSession({
        id: currentSession.user.id,
        email: currentSession.user.email,
        fullName: data.fullName,
      });
    }

    try {
      const dto = await apiClient<UserDto>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: data.fullName }),
      });
      return mapUserDtoToDomain(dto);
    } catch {
      return {
        id: currentSession?.user.id || "usr_dev_1",
        email: currentSession?.user.email || "student@bano.ai",
        fullName: data.fullName,
        createdAt: new Date().toISOString(),
      };
    }
  },

  /**
   * Google Sign-in with Firebase.
   * Signs in via popup, gets ID token, stores session, and contacts backend /users/me.
   */
  async signInWithGoogle(): Promise<User> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error("Firebase Auth is not configured. Please check your environment variables.");
    }

    const provider = getGoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();

    authManager.setFirebaseSession(result.user, token);

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error("Signed in with Google but failed to sync user with backend");
    }
    return user;
  },

  /**
   * Email/Password Login (Dev mode or fallback):
   * Sets up token format for backend and calls GET /api/v1/users/me.
   */
  async login(credentials: { email: string; password?: string; rememberMe?: boolean }): Promise<User> {
    const defaultName = credentials.email.split("@")[0] || "Dev Student";
    authManager.setDevSession({
      email: credentials.email,
      fullName: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
    });

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error("Unable to authenticate user with backend");
    }
    return user;
  },

  /**
   * Signup (Dev mode):
   * Creates dev session with given details and calls GET /api/v1/users/me.
   */
  async signup(data: { full_name: string; email: string; password?: string }): Promise<User> {
    authManager.setDevSession({
      email: data.email,
      fullName: data.full_name,
    });

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error("Unable to create and authenticate user with backend");
    }
    return user;
  },

  async forgotPassword(email: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    void email;
  },

  async logout(): Promise<void> {
    if (env.AUTH_MODE === "firebase") {
      const auth = getFirebaseAuth();
      if (auth) {
        try {
          await signOut(auth);
        } catch (err) {
          console.warn("Error signing out from Firebase:", err);
        }
      }
    }
    authManager.clearSession();
  },
};
