"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createWebsite, getWebsite, listWebsites, updateWebsite } from "@/lib/websites-api";
import type { CreateWebsiteRequest, UpdateWebsiteRequest } from "@/lib/websites";
import { useUserInfoStore } from "@/stores/user-info-store";

// All website queries start with "websites", so one invalidate refreshes all of them.
export function useWebsites() {
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["websites"],
    queryFn: ({ signal }) => listWebsites(accessToken ?? "", signal),
    enabled: Boolean(accessToken),
  });
}

export function useWebsite(websiteId: number) {
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["websites", websiteId],
    queryFn: ({ signal }) => getWebsite(accessToken ?? "", websiteId, signal),
    // don't call the API with a bad id from the URL, e.g. /websites/abc
    enabled: Boolean(accessToken) && Number.isInteger(websiteId) && websiteId > 0,
    retry: false,
  });
}

export function useCreateWebsite() {
  const queryClient = useQueryClient();
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useMutation({
    mutationFn: (input: CreateWebsiteRequest) => createWebsite(accessToken ?? "", input),
    // the sidebar and dashboard count need the new website
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["websites"] }),
    retry: false,
  });
}

export function useUpdateWebsite(websiteId: number) {
  const queryClient = useQueryClient();
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useMutation({
    mutationFn: (input: UpdateWebsiteRequest) => updateWebsite(accessToken ?? "", websiteId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["websites"] }),
    retry: false,
  });
}
