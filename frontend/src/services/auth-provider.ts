import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { env } from "@/config/env";
import { getFirebaseAuth } from "@/lib/firebase";

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

const STORAGE_KEY = "bano_auth_session";

class AuthManager {
  private session: AuthSession | null = null;
  private listeners: Set<(session: AuthSession | null) => void> = new Set();
  private firebaseInitialized = false;

  constructor() {
    this.restoreSession();
    this.initFirebaseListener();
  }

  private initFirebaseListener() {
    if (typeof window === "undefined") return;
    if (this.firebaseInitialized) return;

    if (env.AUTH_MODE === "firebase") {
      const auth = getFirebaseAuth();
      if (auth) {
        this.firebaseInitialized = true;
        onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
          if (firebaseUser) {
            try {
              const token = await firebaseUser.getIdToken();
              const session: AuthSession = {
                token,
                user: {
                  id: firebaseUser.uid,
                  email: firebaseUser.email || `${firebaseUser.uid}@bano.ai`,
                  fullName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Student",
                },
              };
              this.session = session;
              this.persistSession(session);
              this.notify();
            } catch (err) {
              console.error("Failed to retrieve Firebase ID token:", err);
            }
          } else {
            // Only clear if we were using Firebase auth
            if (this.session && !this.session.user.id.startsWith("usr_dev_")) {
              this.clearSession();
            }
          }
        });
      }
    }
  }

  private restoreSession() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.session = JSON.parse(raw);
      }
    } catch {
      try {
        window.localStorage?.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }

  private persistSession(session: AuthSession) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        // storage disabled or quota exceeded
      }
    }
  }

  /**
   * Returns current token to be used in Authorization header.
   */
  async getValidToken(): Promise<string | null> {
    if (!this.session) {
      this.restoreSession();
    }

    if (env.AUTH_MODE === "firebase") {
      const auth = getFirebaseAuth();
      if (auth && auth.currentUser) {
        try {
          const freshToken = await auth.currentUser.getIdToken(false);
          if (this.session) {
            this.session.token = freshToken;
            this.persistSession(this.session);
          }
          return freshToken;
        } catch {
          return this.session?.token ?? null;
        }
      }
    }

    return this.session?.token ?? null;
  }

  /**
   * Synchronous token getter for quick header inspection.
   */
  getToken(): string | null {
    if (!this.session) {
      this.restoreSession();
    }
    return this.session?.token ?? null;
  }

  getSession(): AuthSession | null {
    if (!this.session) {
      this.restoreSession();
    }
    return this.session;
  }

  /**
   * Sets active session from a Firebase user authentication.
   */
  setFirebaseSession(firebaseUser: FirebaseUser, token: string): AuthSession {
    const session: AuthSession = {
      token,
      user: {
        id: firebaseUser.uid,
        email: firebaseUser.email || `${firebaseUser.uid}@bano.ai`,
        fullName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Student",
      },
    };

    this.session = session;
    this.persistSession(session);
    this.notify();
    return session;
  }

  /**
   * Sets active session in dev mode.
   * Creates a token payload formatted for backend AUTH_MODE=dev:
   * JSON string with id, email, full_name.
   */
  setDevSession(user: { id?: string; email: string; fullName: string }): AuthSession {
    const userId = user.id || `usr_dev_${Date.now()}`;
    const payload = {
      id: userId,
      email: user.email,
      full_name: user.fullName,
    };
    const token = JSON.stringify(payload);

    const session: AuthSession = {
      token,
      user: {
        id: userId,
        email: user.email,
        fullName: user.fullName,
      },
    };

    this.session = session;
    this.persistSession(session);
    this.notify();
    return session;
  }

  clearSession() {
    this.session = null;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  subscribe(listener: (session: AuthSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.session));
  }
}

export const authManager = new AuthManager();
