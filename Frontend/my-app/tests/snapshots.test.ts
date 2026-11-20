import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { ApiError } from "../lib/api-client";
import { getSnapshot, inspectWebsite, listSnapshots, setScope } from "../lib/snapshots-api";

const API_URL = "http://localhost:8000";
const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

// Shape returned by FastAPI (ElementResponse), like a real "Log in" button
const apiElement = {
  id: 11,
  html_id: "login-btn",
  name: "Log in",
  role: "button",
  tag_name: "button",
  attributes: { type: "submit", class: "btn" },
  locator_candidates: [
    { strategy: "role", code: 'page.get_by_role("button", name="Log in", exact=True)', match_count: 1, unique: true, matches_element: true, recommended: true },
    { strategy: "text", code: 'page.get_by_text("Log in", exact=True)', match_count: 2, unique: false, matches_element: false, recommended: false },
  ],
  page_context: {
    page_url: "http://localhost:5000/login",
    page_title: "Login",
    frame: "main",
    index: 0,
    text: "Log in",
    label: null,
    form: { id: "login-form", name: null, action: "/login", method: "post" },
    disabled: false,
    has_click_handler: false,
    bounding_box: { x: 10, y: 20, width: 80, height: 30 },
  },
};

const apiSummary = {
  id: 7,
  website_id: 3,
  previous_snapshot_id: null,
  page_url: "http://localhost:5000/login",
  test_type: null,
  test_goal: null,
  captured_at: "2026-11-20T10:00:00.000+00:00",
  element_count: 1,
  has_screenshot: true,
};

const apiDetail = { ...apiSummary, selected_element_ids: null, confirmed_requirements: null, elements: [apiElement] };

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = API_URL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
});

test("inspectWebsite posts the page URL and converts the elements", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, API_URL + "/websites/3/snapshots");
    assert.equal(options?.method, "POST");
    assert.deepEqual(JSON.parse(String(options?.body)), { page_url: "http://localhost:5000/login" });
    return Response.json(apiDetail, { status: 201 });
  };
  const snapshot = await inspectWebsite("test-token", 3, { pageUrl: "http://localhost:5000/login" });

  assert.equal(snapshot.hasScope, false);
  assert.deepEqual(snapshot.selectedElementIds, []);
  const el = snapshot.elements[0];
  assert.equal(el.displayName, "Log in");
  assert.equal(el.formName, "login-form");
  assert.equal(el.recommendedLocator?.strategy, "role");
  assert.equal(el.locators[1].matchCount, 2);
});

test("inspectWebsite sends an empty page URL as null (use the website's main URL)", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.deepEqual(JSON.parse(String(options?.body)), { page_url: null });
    return Response.json(apiDetail, { status: 201 });
  };
  await inspectWebsite("test-token", 3, { pageUrl: "  " });
});

test("an element without a name falls back to its placeholder", async () => {
  const input = {
    ...apiElement, name: null, html_id: null, attributes: { placeholder: "Email" },
    page_context: { ...apiElement.page_context, text: null, label: null, form: null },
    locator_candidates: [],
  };
  globalThis.fetch = async () => Response.json({ ...apiDetail, elements: [input] });
  const el = (await getSnapshot("test-token", 7)).elements[0];
  assert.equal(el.displayName, "Email");
  assert.equal(el.recommendedLocator, null);
});

test("a busy browser keeps the backend's 409 message", async () => {
  globalThis.fetch = async () =>
    Response.json({ detail: "Another browser job is already running, try again when it finishes" }, { status: 409 });
  await assert.rejects(inspectWebsite("test-token", 3, {}), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    return true;
  });
});

test("listSnapshots returns summaries for one website", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, API_URL + "/websites/3/snapshots");
    return Response.json([{ ...apiSummary, test_type: "smoke", test_goal: "Login works" }]);
  };
  const [summary] = await listSnapshots("test-token", 3);
  assert.equal(summary.hasScope, true);
  assert.equal(summary.testType, "smoke");
});

test("setScope sends the selected elements and cleaned requirements", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, API_URL + "/snapshots/7/scope");
    assert.equal(options?.method, "PUT");
    assert.deepEqual(JSON.parse(String(options?.body)), {
      test_type: "smoke",
      test_goal: "Login works",
      select_all: false,
      element_ids: [11],
      requirements: ["Wrong password shows an error"],
    });
    return Response.json({
      ...apiDetail,
      test_type: "smoke",
      test_goal: "Login works",
      selected_element_ids: [11],
      confirmed_requirements: [{ id: "R1", text: "Wrong password shows an error" }],
    });
  };
  const snapshot = await setScope("test-token", 7, {
    testType: "smoke",
    testGoal: " Login works ",
    selectAll: false,
    elementIds: [11],
    requirements: ["Wrong password shows an error", "   ", ""],
  });
  assert.deepEqual(snapshot.selectedElementIds, [11]);
  assert.equal(snapshot.requirements[0].id, "R1");
});

test("setScope with select all sends no element ids", async () => {
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.equal(body.select_all, true);
    assert.deepEqual(body.element_ids, []);
    return Response.json({ ...apiDetail, test_type: "regression", test_goal: "All", selected_element_ids: [11] });
  };
  await setScope("test-token", 7, { testType: "regression", testGoal: "All of it", selectAll: true, elementIds: [11], requirements: [] });
});

test("setScope needs at least one element, with a readable message", async () => {
  globalThis.fetch = async () => { throw new Error("fetch must not run"); };
  await assert.rejects(
    setScope("test-token", 7, { testType: "smoke", testGoal: "Login works", selectAll: false, elementIds: [], requirements: [] }),
    { message: "Select at least one element." }
  );
});

test("setScope needs a goal of at least 3 characters", async () => {
  globalThis.fetch = async () => { throw new Error("fetch must not run"); };
  await assert.rejects(
    setScope("test-token", 7, { testType: "smoke", testGoal: "ab", selectAll: true, elementIds: [], requirements: [] }),
    /at least 3 characters/
  );
});
