import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { ApiError, apiRequest } from "../lib/api-client";
import { login, getCurrentUserInfo } from "../lib/auth-api";
import type { UserInfo } from "../lib/auth";
import { useUserInfoStore } from "../stores/user-info-store";

const API_URL = "http://localhost:8000";
const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
const credentials = { identifier: "tester@example.com", password: "test-password" };

// Shape returned by FastAPI's /auth/register and /auth/me (UserResponse)
const apiUser = {
  id: 1,
  first_name: "Test",
  last_name: "User",
  username: "tester",
  email: "tester@example.com",
  joined_at: "2026-11-20T10:00:00.000+00:00",
};

const normalizedUser: UserInfo = {
  id: 1,
  firstName: "Test",
  lastName: "User",
  fullName: "Test User",
  username: "tester",
  email: "tester@example.com",
  joinedAt: "2026-11-20T10:00:00.000+00:00",
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = API_URL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  useUserInfoStore.getState().clearSession();
});

test("login posts JSON credentials and normalizes the FastAPI response", async () => {
  process.env.NEXT_PUBLIC_API_URL = API_URL + "/"; // trailing slash is stripped
  globalThis.fetch = async (url, options) => {
    assert.equal(url, API_URL + "/auth/login");
    assert.equal(options?.method, "POST");
    assert.equal(new Headers(options?.headers).get("Content-Type"), "application/json");
    assert.deepEqual(JSON.parse(String(options?.body)), credentials);
    return Response.json({ access_token: "test-token", token_type: "bearer" });
  };
  assert.deepEqual(await login(credentials), { accessToken: "test-token", tokenType: "bearer", user: null });
});

test("invalid credentials are rejected before making a request", async () => {
  globalThis.fetch = async () => { throw new Error("fetch must not run"); };
  await assert.rejects(login({ identifier: "  ", password: "" }), /email or username/);
});

test("a 200 response with a missing token is rejected", async () => {
  globalThis.fetch = async () => Response.json({ message: "ok" });
  await assert.rejects(login(credentials), /invalid login response/);
  assert.equal(useUserInfoStore.getState().isSignedIn, false);
});

test("an empty access token is rejected", async () => {
  globalThis.fetch = async () => Response.json({ access_token: "  ", token_type: "bearer" });
  await assert.rejects(login(credentials), /invalid login response/);
});

test("FastAPI 401 errors preserve their status and message", async () => {
  globalThis.fetch = async () =>
    Response.json({ detail: "Invalid username/email or password" }, { status: 401 });
  await assert.rejects(login(credentials), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    assert.equal(error.message, "Invalid username/email or password");
    return true;
  });
});

test("FastAPI validation errors become readable messages", async () => {
  globalThis.fetch = async () =>
    Response.json({ detail: [{ msg: "Identifier is required" }, { msg: "Password is required" }] }, { status: 422 });
  await assert.rejects(login(credentials), /Identifier is required Password is required/);
});

test("non-JSON server errors produce a useful fallback", async () => {
  globalThis.fetch = async () => new Response("<html>Server error</html>", { status: 500 });
  await assert.rejects(login(credentials), /Request failed \(500\)/);
});

test("network errors produce a connection message", async () => {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(login(credentials), /Unable to connect/);
});

test("current-user requests send the bearer token and normalize profile fields", async () => {
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, API_URL + "/auth/me");
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-token");
    assert.equal(options?.signal, controller.signal);
    return Response.json(apiUser);
  };
  assert.deepEqual(await getCurrentUserInfo("test-token", controller.signal), normalizedUser);
});

test("current-user requests require a token", async () => {
  globalThis.fetch = async () => { throw new Error("fetch must not run"); };
  await assert.rejects(getCurrentUserInfo(""), /Sign in/);
});

test("canceled requests preserve AbortError", async () => {
  globalThis.fetch = async () => { throw new DOMException("Aborted", "AbortError"); };
  await assert.rejects(apiRequest("/auth/me"), { name: "AbortError" });
});

test("session actions update token and sign-in state together and clear all user data", () => {
  const store = useUserInfoStore.getState;
  store().setUserInfo(normalizedUser); // ignored without a token
  assert.equal(store().userInfo, null);
  assert.throws(() => store().setSession(" "), /token is required/);
  store().setSession("test-token", normalizedUser);
  assert.equal(store().isSignedIn, true);
  assert.deepEqual(store().userInfo, normalizedUser);
  store().clearSession();
  assert.equal(store().isSignedIn, false);
  assert.equal(store().userInfo, null);
  assert.equal(store().accessToken, null);
});
