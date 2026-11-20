"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSnapshot, inspectWebsite, listSnapshots, setScope } from "@/lib/snapshots-api";
import type { InspectRequest, ScopeRequest } from "@/lib/snapshots";
import { useUserInfoStore } from "@/stores/user-info-store";

const isValidId = (id: number) => Number.isInteger(id) && id > 0;

// Query keys:
//   ["snapshots", "website", websiteId] -> list for one website
//   ["snapshots", snapshotId]           -> one snapshot with its elements
export function useSnapshots(websiteId: number) {
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["snapshots", "website", websiteId],
    queryFn: ({ signal }) => listSnapshots(accessToken ?? "", websiteId, signal),
    enabled: Boolean(accessToken) && isValidId(websiteId),
  });
}

export function useSnapshot(snapshotId: number) {
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["snapshots", snapshotId],
    queryFn: ({ signal }) => getSnapshot(accessToken ?? "", snapshotId, signal),
    enabled: Boolean(accessToken) && isValidId(snapshotId),
    retry: false,
  });
}

export function useInspectWebsite(websiteId: number) {
  const queryClient = useQueryClient();
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useMutation({
    mutationFn: (input: InspectRequest) => inspectWebsite(accessToken ?? "", websiteId, input),
    onSuccess: (snapshot) => {
      // we already have the full result, so the inspect page doesn't need to fetch it again
      queryClient.setQueryData(["snapshots", snapshot.id], snapshot);
      queryClient.invalidateQueries({ queryKey: ["snapshots", "website", websiteId] });
    },
    retry: false, // never open the browser twice by accident
  });
}

export function useSetScope(snapshotId: number) {
  const queryClient = useQueryClient();
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useMutation({
    mutationFn: (input: ScopeRequest) => setScope(accessToken ?? "", snapshotId, input),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(["snapshots", snapshotId], snapshot);
      queryClient.invalidateQueries({ queryKey: ["snapshots", "website", snapshot.websiteId] });
    },
    retry: false,
  });
}
