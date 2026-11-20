"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { login, getCurrentUserInfo } from "@/lib/auth-api";
import { useUserInfoStore } from "@/stores/user-info-store";

export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useUserInfoStore((state) => state.setSession); // The selector subscribes to just the setSession function, which never changes, so this component never re-renders because of the store

  return useMutation({
    mutationFn: login, // Mutation = a write, such as a POST
    onSuccess: async (response) => {
      // Cancel and discard data belonging to any previous session.
      await queryClient.cancelQueries(); // aborts any in-flight requests from the previous session
      queryClient.removeQueries(); // with no arguments wipes the entire cache, so the new user can’t see the old user’s data.
      setSession(response.accessToken, response.user);
    },
    retry: false,
    // Remove passwords and token responses from the cache after unmount.
    gcTime: 0,
  });
}

export function useGetCurrentUserInfo(options?: { enabled?: boolean }) { 
  // This one subscribes to the token, so the component re-renders when it changes.
  const accessToken = useUserInfoStore((state) => state.accessToken);
  const query = useQuery({
    queryKey: ["current-user-info"],
    // The signal is an AbortSignal from React Query. Pass it to fetch and the request is cancelled
    queryFn: ({ signal }) => getCurrentUserInfo(accessToken ?? "", signal),
    // The query runs only if there is a token and the caller hasn’t disabled it.
    enabled: Boolean(accessToken) && (options?.enabled ?? true),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    // getState() reads the store’s current value non-reactively, avoiding stale closures.
    const store = useUserInfoStore.getState();
    // Guard: bail out if signed out or if the token has changed since this render
    if (!accessToken || store.accessToken !== accessToken) return;
    if (query.error instanceof ApiError && query.error.status === 401) {
      store.clearSession(); // If the server says the token is invalid, log out locally.
    } else if (query.data && !query.isError) {
      store.setUserInfo(query.data);
    }
  }, [accessToken, query.data, query.error, query.isError]);

  return query;
}
