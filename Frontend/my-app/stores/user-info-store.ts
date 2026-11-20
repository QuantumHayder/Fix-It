"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserInfo } from "@/lib/auth";

interface UserInfoStore {
  userInfo: UserInfo | null;
  accessToken: string | null;
  isSignedIn: boolean;
  hasHydrated: boolean;
  setSession: (accessToken: string, userInfo?: UserInfo | null) => void;
  setUserInfo: (userInfo: UserInfo) => void;
  clearSession: () => void;
}

// The token lives in localStorage, so XSS could read it. Acceptable for this
// project; the API still validates the JWT on every protected request.
export const useUserInfoStore = create<UserInfoStore>()(
  persist(
    (set) => ({
      userInfo: null,
      accessToken: null,
      isSignedIn: false,
      hasHydrated: false,
      setSession: (accessToken, userInfo = null) => {
        if (!accessToken.trim()) throw new Error("An access token is required.");
        set({ accessToken, userInfo, isSignedIn: true });
      },
      setUserInfo: (userInfo) => set((s) => (s.accessToken ? { userInfo } : {})),
      clearSession: () => set({ userInfo: null, accessToken: null, isSignedIn: false }),
    }),
    {
      name: "fixit-session",
      partialize: (s) => ({ accessToken: s.accessToken, isSignedIn: s.isSignedIn }),
      // Rehydrate manually after mount so server and client render the same first HTML
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useUserInfoStore.setState({ hasHydrated: true });
      },
    }
  )
);