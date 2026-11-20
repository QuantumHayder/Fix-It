"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetCurrentUserInfo } from "@/hooks/api/use-login";
import { useUserInfoStore } from "@/stores/user-info-store";

function AuthSession() {
  useGetCurrentUserInfo();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    void useUserInfoStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSession />
      {children}
    </QueryClientProvider>
  );
}