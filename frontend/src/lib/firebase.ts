import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { env } from "@/config/env";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

/** Initialize (or return cached) Firebase app */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;

  if (!env.FIREBASE.apiKey || !env.FIREBASE.projectId) {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  try {
    firebaseApp = initializeApp({
      apiKey: env.FIREBASE.apiKey,
      authDomain: env.FIREBASE.authDomain,
      projectId: env.FIREBASE.projectId,
      storageBucket: env.FIREBASE.storageBucket,
      messagingSenderId: env.FIREBASE.messagingSenderId,
      appId: env.FIREBASE.appId,
      measurementId: env.FIREBASE.measurementId,
    });
    return firebaseApp;
  } catch (error) {
    console.warn("Failed to initialize Firebase app:", error);
    return null;
  }
}

/** Returns a singleton Auth instance with persistence handling */
export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  if (firebaseAuth) return firebaseAuth;

  const app = getFirebaseApp();
  if (!app) return null;

  try {
    const auth = getAuth(app);
    // Prefer local persistence, fallback to in‑memory if unavailable
    import("firebase/auth").then(
      ({ setPersistence, browserLocalPersistence, inMemoryPersistence }) => {
        setPersistence(auth, browserLocalPersistence).catch(() => {
          console.warn(
            "Local persistence unavailable – using in‑memory persistence for Firebase Auth"
          );
          setPersistence(auth, inMemoryPersistence).catch(() => {
            console.warn(
              "Failed to set any Firebase persistence – auth may not survive page reloads"
            );
          });
        });
      }
    );
    firebaseAuth = auth;
    return firebaseAuth;
  } catch (error) {
    console.warn("Failed to get Firebase Auth instance:", error);
    return null;
  }
}

/** Returns a singleton GoogleAuthProvider */
export function getGoogleAuthProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    // Force account selection every login
    googleProvider.setCustomParameters({ prompt: "select_account" });
  }
  return googleProvider;
}
