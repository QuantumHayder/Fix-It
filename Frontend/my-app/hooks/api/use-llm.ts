"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLlmCall, getLlmUsage, listModels, summarizeSnapshot } from "@/lib/llm-api";
import { useUserInfoStore } from "@/stores/user-info-store";

export function useModels() {
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["llm-models"],
    queryFn: ({ signal }) => listModels(accessToken ?? "", signal),
    enabled: Boolean(accessToken),
    retry: false, // if Ollama is off, show the message right away
    staleTime: 60_000,
  });
}

export function useLlmUsage(snapshotId: number) {
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["llm-usage", snapshotId],
    queryFn: ({ signal }) => getLlmUsage(accessToken ?? "", snapshotId, signal),
    enabled: Boolean(accessToken) && snapshotId > 0,
  });
}

// Used only when the user opens "Show prompt & answer", so the long texts load on demand
export function useLlmCall(callId: number) {
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["llm-call", callId],
    queryFn: ({ signal }) => getLlmCall(accessToken ?? "", callId, signal),
    enabled: Boolean(accessToken),
    staleTime: Infinity, // a saved call never changes
  });
}

export function useSummarize(snapshotId: number) {
  const queryClient = useQueryClient();
  const accessToken = useUserInfoStore((s) => s.accessToken);
  return useMutation({
    mutationFn: (model: string | null) => summarizeSnapshot(accessToken ?? "", snapshotId, model),
    // the backend logs failed calls too, so refresh the usage table either way
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["llm-usage", snapshotId] }),
    retry: false,
  });
}
