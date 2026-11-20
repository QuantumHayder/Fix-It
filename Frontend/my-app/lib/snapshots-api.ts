import { apiRequest, authHeaders, parseInput } from "./api-client";
import {
  InspectRequestSchema, ScopeRequestSchema, SnapshotDetailSchema, SnapshotSummaryListSchema,
  type InspectRequest, type ScopeRequest,
} from "./snapshots";

// Opens a visible browser on the backend machine. This request can take up to ~90 seconds.
export async function inspectWebsite(accessToken: string, websiteId: number, input: InspectRequest) {
  const p = parseInput(InspectRequestSchema, input);
  const body = await apiRequest("/websites/" + websiteId + "/snapshots", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ page_url: p.pageUrl || null }),
  });
  const parsed = SnapshotDetailSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid inspection result.");
  return parsed.data;
}

export async function listSnapshots(accessToken: string, websiteId: number, signal?: AbortSignal) {
  const body = await apiRequest("/websites/" + websiteId + "/snapshots", {
    headers: authHeaders(accessToken),
    signal,
  });
  const parsed = SnapshotSummaryListSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid inspection list.");
  return parsed.data;
}

export async function getSnapshot(accessToken: string, snapshotId: number, signal?: AbortSignal) {
  const body = await apiRequest("/snapshots/" + snapshotId, { headers: authHeaders(accessToken), signal });
  const parsed = SnapshotDetailSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid inspection result.");
  return parsed.data;
}

export async function setScope(accessToken: string, snapshotId: number, input: ScopeRequest) {
  const p = parseInput(ScopeRequestSchema, input);
  const body = await apiRequest("/snapshots/" + snapshotId + "/scope", {
    method: "PUT",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      test_type: p.testType,
      test_goal: p.testGoal,
      select_all: p.selectAll,
      // the backend ignores the ids when select_all is true
      element_ids: p.selectAll ? [] : p.elementIds,
      requirements: p.requirements,
    }),
  });
  const parsed = SnapshotDetailSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid inspection result.");
  return parsed.data;
}
