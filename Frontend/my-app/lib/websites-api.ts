import { apiRequest, authHeaders, parseInput } from "./api-client";
import {
  CreateWebsiteRequestSchema, UpdateWebsiteRequestSchema, WebsiteListSchema, WebsiteSchema,
  type CreateWebsiteRequest, type UpdateWebsiteRequest,
} from "./websites";

export async function listWebsites(accessToken: string, signal?: AbortSignal) {
  const body = await apiRequest("/websites", { headers: authHeaders(accessToken), signal });
  const parsed = WebsiteListSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid website list.");
  return parsed.data;
}

export async function getWebsite(accessToken: string, websiteId: number, signal?: AbortSignal) {
  const body = await apiRequest("/websites/" + websiteId, { headers: authHeaders(accessToken), signal });
  const parsed = WebsiteSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid website.");
  return parsed.data;
}

export async function createWebsite(accessToken: string, input: CreateWebsiteRequest) {
  const p = parseInput(CreateWebsiteRequestSchema, input);
  const body = await apiRequest("/websites", {
    method: "POST",
    headers: authHeaders(accessToken),
    // an empty name is sent as null, so the backend stores "no name"
    body: JSON.stringify({ url: p.url, display_name: p.displayName || null }),
  });
  const parsed = WebsiteSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid website.");
  return parsed.data;
}

export async function updateWebsite(accessToken: string, websiteId: number, input: UpdateWebsiteRequest) {
  const p = parseInput(UpdateWebsiteRequestSchema, input);
  const body = await apiRequest("/websites/" + websiteId, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ display_name: p.displayName || null }),
  });
  const parsed = WebsiteSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid website.");
  return parsed.data;
}
