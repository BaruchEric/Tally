"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
  type User
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from "@/src/lib/firebase/client";
import { enableOfflinePersistence } from "@/src/lib/firebase/persistence";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function requireAuth(): Auth {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }

  return auth;
}

async function mirrorUser(user: User) {
  const db = getFirestoreDb();
  if (!db) {
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  const profile = {
    displayName: user.displayName,
    email: user.email?.toLowerCase() ?? null,
    photoURL: user.photoURL,
    updatedAt: serverTimestamp()
  };

  if (existing.exists()) {
    await setDoc(userRef, profile, { merge: true });
  } else {
    await setDoc(userRef, { ...profile, createdAt: serverTimestamp() });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => {
    if (!configured) {
      return false;
    }

    return Boolean(getFirebaseAuth() && getFirestoreDb());
  });

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();

    if (!auth || !db) {
      return undefined;
    }

    void enableOfflinePersistence(db).catch((error) => {
      console.warn("Firestore persistence unavailable", error);
    });

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        void mirrorUser(nextUser).catch((error) => {
          console.warn("mirrorUser failed", error);
        });
      }
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(requireAuth(), email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(requireAuth(), email, password);
    await updateProfile(result.user, { displayName });
    await sendEmailVerification(result.user);
    await mirrorUser(result.user);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(requireAuth(), provider);
    await mirrorUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }

    await firebaseSignOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut
    }),
    [configured, loading, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
