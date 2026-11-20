"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register } from "@/lib/auth-api";
import type { RegisterRequest } from "@/lib/auth";
import { useUserInfoStore } from "@/stores/user-info-store";

export function useRegister() {
  const queryClient = useQueryClient();
  const setSession = useUserInfoStore((s) => s.setSession);

  return useMutation({
    // The API's register returns the user, not a token, so log in right after
    mutationFn: async (input: RegisterRequest) => {
      await register(input);
      return login({ identifier: input.email, password: input.password });
    },
    onSuccess: async (response) => {
      await queryClient.cancelQueries();
      queryClient.removeQueries();
      setSession(response.accessToken, response.user);
    },
    retry: false,
    gcTime: 0,
  });
}