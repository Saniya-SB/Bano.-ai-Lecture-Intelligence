import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { env } from "@/config/env";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

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

export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  if (firebaseAuth) return firebaseAuth;

  const app = getFirebaseApp();
  if (!app) return null;

  try {
    firebaseAuth = getAuth(app);
    return firebaseAuth;
  } catch (error) {
    console.warn("Failed to get Firebase Auth instance:", error);
    return null;
  }
}

export function getGoogleAuthProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
  }
  return googleProvider;
}

