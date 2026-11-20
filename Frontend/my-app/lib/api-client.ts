import { z } from "zod";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

const ErrorResponseSchema = z.object({
  detail: z.union([
    z.string(),
    z.array(z.object({ msg: z.string() })),
  ]).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Check user input before sending it. Zod's own error message is a JSON list,
// so throw only the first readable message (e.g. "Select at least one element.").
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid input.");
  return result.data;
}

// Headers for protected JSON endpoints (everything except register/login)
export function authHeaders(accessToken: string) {
  if (!accessToken.trim()) throw new Error("Sign in to continue.");
  return { "Content-Type": "application/json", Authorization: "Bearer " + accessToken };
}

export async function apiRequest(path: string, options: RequestInit = {}): Promise<unknown> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  if (!baseUrl) {
  throw new Error("NEXT_PUBLIC_API_URL is not set. Add it to .env.local and restart the dev server.");
}
  let response: Response;

  try {
    response = await fetch(baseUrl + path, {
      ...options,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("Unable to connect to the server. Please try again.");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ErrorResponseSchema.safeParse(body);
    const detail = parsed.success ? parsed.data.detail : undefined;
    const message = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => item.msg).join(" ")
        : parsed.success ? parsed.data.error || parsed.data.message : undefined;

    throw new ApiError(message || "Request failed (" + response.status + "). Please try again.", response.status);
  }

  return body;
}
