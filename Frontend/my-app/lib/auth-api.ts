import { apiRequest, parseInput } from "./api-client";
import {
  LoginRequestSchema, LoginResponseSchema, RegisterRequestSchema, UserInfoSchema,
  type LoginRequest, type RegisterRequest,
} from "./auth";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function login(credentials: LoginRequest) {
  const payload = parseInput(LoginRequestSchema, credentials);
  const body = await apiRequest("/auth/login", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
  const parsed = LoginResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid login response.");
  return parsed.data;
}

export async function register(input: RegisterRequest) {
  const p = parseInput(RegisterRequestSchema, input);
  const body = await apiRequest("/auth/register", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      first_name: p.firstName,
      last_name: p.lastName,
      username: p.username,
      email: p.email,
      password: p.password,
    }),
  });
  const parsed = UserInfoSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid registration response.");
  return parsed.data;
}

export async function getCurrentUserInfo(accessToken: string, signal?: AbortSignal) {
  if (!accessToken.trim()) throw new Error("Sign in to view your account.");
  const body = await apiRequest("/auth/me", {
    headers: { Authorization: "Bearer " + accessToken },
    signal,
  });
  const parsed = UserInfoSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid user profile.");
  return parsed.data;
}