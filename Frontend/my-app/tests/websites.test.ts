import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { ApiError } from "../lib/api-client";
import { createWebsite, getWebsite, listWebsites, updateWebsite } from "../lib/websites-api";

const API_URL = "http://localhost:8000";
const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

// Shape returned by FastAPI (WebsiteResponse)
const apiWebsite = {
  id: 3,
  url: "http://localhost:5000",
  display_name: "Demo shop",
  created_at: "2026-11-20T10:00:00.000+00:00",
};

const website = {
  id: 3,
  url: "http://localhost:5000",
  displayName: "Demo shop",
  label: "Demo shop",
  createdAt: "2026-11-20T10:00:00.000+00:00",
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = API_URL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
});

test("listWebsites sends the token and converts each website", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, API_URL + "/websites");
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-token");
    return Response.json([apiWebsite, { ...apiWebsite, id: 4, display_name: null }]);
  };
  const websites = await listWebsites("test-token");
  assert.deepEqual(websites[0], website);
  // without a name, the label falls back to the URL
  assert.equal(websites[1].label, "http://localhost:5000");
});

test("getWebsite calls /websites/{id}", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, API_URL + "/websites/3");
    return Response.json(apiWebsite);
  };
  assert.deepEqual(await getWebsite("test-token", 3), website);
});

test("createWebsite posts snake_case JSON and sends an empty name as null", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, API_URL + "/websites");
    assert.equal(options?.method, "POST");
    assert.deepEqual(JSON.parse(String(options?.body)), { url: "http://localhost:5000", display_name: null });
    return Response.json({ ...apiWebsite, display_name: null }, { status: 201 });
  };
  const created = await createWebsite("test-token", { url: "  http://localhost:5000 ", displayName: "  " });
  assert.equal(created.displayName, null);
});

test("createWebsite rejects a URL without http(s) before calling the API", async () => {
  globalThis.fetch = async () => { throw new Error("fetch must not run"); };
  await assert.rejects(createWebsite("test-token", { url: "localhost:5000" }), /http:\/\/ or https:\/\//);
});

test("a duplicate website keeps the backend's 409 message", async () => {
  globalThis.fetch = async () => Response.json({ detail: "You already added this website" }, { status: 409 });
  await assert.rejects(createWebsite("test-token", { url: "http://localhost:5000" }), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.message, "You already added this website");
    return true;
  });
});

test("updateWebsite sends PATCH with the new name", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, API_URL + "/websites/3");
    assert.equal(options?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(options?.body)), { display_name: "New name" });
    return Response.json({ ...apiWebsite, display_name: "New name" });
  };
  const updated = await updateWebsite("test-token", 3, { displayName: " New name " });
  assert.equal(updated.label, "New name");
});

test("website requests require a token", async () => {
  globalThis.fetch = async () => { throw new Error("fetch must not run"); };
  await assert.rejects(listWebsites(""), /Sign in/);
});

test("an invalid response from the server is rejected", async () => {
  globalThis.fetch = async () => Response.json({ id: "not-a-number" });
  await assert.rejects(getWebsite("test-token", 3), /invalid website/);
});
