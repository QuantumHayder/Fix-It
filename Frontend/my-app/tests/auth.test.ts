import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ApiError, apiRequest } from "../lib/api-client";
import { login, getCurrentUserInfo } from "../lib/auth-api";
import { useUserInfoStore } from "../stores/user-info-store";

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
const credentials = { email: "tester@example.com", password: "test-password" };

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  useUserInfoStore.getState().clearUserInfo();
});

test("login posts JSON credentials and normalizes the FastAPI response", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:8000/api/auth/login");
    assert.equal(options?.method, "POST");
    assert.equal(new Headers(options?.headers).get("Content-Type"), "application/json");
    assert.deepEqual(JSON.parse(String(options?.body)), credentials);
    return Response.json({ access_token: "test-token", token_type: "bearer" });
  };
  assert.deepEqual(await login(credentials), { accessToken: "test-token", tokenType: "bearer", user: null });
});

test("invalid credentials are rejected before making a request", async () => {
  globalThis.fetch = async () => { throw new Error("fetch must not run"); };
  await assert.rejects(login({ email: "invalid", password: "" }), /valid email/);
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
  globalThis.fetch = async () => Response.json({ detail: "Incorrect email or password" }, { status: 401 });
  await assert.rejects(login(credentials), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    assert.equal(error.message, "Incorrect email or password");
    return true;
  });
});

test("FastAPI validation errors become readable messages", async () => {
  globalThis.fetch = async () => Response.json({ detail: [{ msg: "Email is required" }, { msg: "Password is required" }] }, { status: 422 });
  await assert.rejects(login(credentials), /Email is required Password is required/);
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
  globalThis.fetch = async (_url, options) => {
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-token");
    assert.equal(options?.signal, controller.signal);
    return Response.json({ id: 1, email: credentials.email, full_name: "Test User" });
  };
  assert.deepEqual(await getCurrentUserInfo("test-token", controller.signal), {
    id: 1, email: credentials.email, fullName: "Test User",
  });
});

test("current-user requests require a token", async () => {
  globalThis.fetch = async () => { throw new Error("fetch must not run"); };
  await assert.rejects(getCurrentUserInfo(""), /Sign in/);
});

test("canceled requests preserve AbortError", async () => {
  globalThis.fetch = async () => { throw new DOMException("Aborted", "AbortError"); };
  await assert.rejects(apiRequest("/api/auth/current-user"), { name: "AbortError" });
});

test("session actions update token and sign-in state together and clear all user data", () => {
  const user = { id: 1, email: credentials.email, fullName: null };
  useUserInfoStore.getState().setUserInfo(user);
  assert.equal(useUserInfoStore.getState().userInfo, null);
  assert.throws(() => useUserInfoStore.getState().setSession(" "), /token is required/);
  useUserInfoStore.getState().setSession("test-token", user);
  assert.equal(useUserInfoStore.getState().isSignedIn, true);
  assert.deepEqual(useUserInfoStore.getState().userInfo, user);
  useUserInfoStore.getState().clearUserInfo();
  const state = useUserInfoStore.getState();
  assert.equal(state.isSignedIn, false);
  assert.equal(state.userInfo, null);
  assert.equal(state.accessToken, null);
});
