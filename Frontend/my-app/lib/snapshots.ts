import { z } from "zod";

// Must match TestType in Backend/app/schemas/snapshot.py
export const TEST_TYPES = ["smoke", "regression"] as const;

// ---------- requests ----------

export const InspectRequestSchema = z.object({
  // empty = inspect the website's main URL
  pageUrl: z.string().trim().max(2048).optional(),
});

export const ScopeRequestSchema = z
  .object({
    testType: z.enum(TEST_TYPES, "Choose a test type."),
    testGoal: z.string().trim().min(3, "Describe the testing goal (at least 3 characters).").max(2000),
    selectAll: z.boolean(),
    elementIds: z.array(z.number()),
    // one requirement per item, empty lines are removed
    requirements: z.array(z.string()).transform((list) => list.map((r) => r.trim()).filter(Boolean)),
  })
  .refine((s) => s.selectAll || s.elementIds.length > 0, "Select at least one element.");

// ---------- responses ----------

const LocatorCandidateSchema = z
  .object({
    strategy: z.string(),
    code: z.string(),
    match_count: z.number(),
    unique: z.boolean(),
    matches_element: z.boolean(),
    recommended: z.boolean(),
  })
  .transform((c) => ({
    strategy: c.strategy,
    code: c.code,
    matchCount: c.match_count,
    unique: c.unique,
    matchesElement: c.matches_element,
    recommended: c.recommended,
  }));

// Only the page_context fields the UI uses; the rest are ignored.
const PageContextSchema = z.object({
  text: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  disabled: z.boolean().optional(),
  form: z
    .object({ id: z.string().nullable(), name: z.string().nullable() })
    .nullable()
    .optional(),
});

export const ElementSchema = z
  .object({
    id: z.number(),
    html_id: z.string().nullable(),
    name: z.string().nullable(),
    role: z.string().nullable(),
    tag_name: z.string(),
    attributes: z.record(z.string(), z.unknown()),
    locator_candidates: z.array(LocatorCandidateSchema),
    page_context: PageContextSchema,
  })
  .transform((e) => {
    const placeholder = typeof e.attributes.placeholder === "string" ? e.attributes.placeholder : null;
    const form = e.page_context.form;
    return {
      id: e.id,
      htmlId: e.html_id,
      name: e.name,
      role: e.role,
      tagName: e.tag_name,
      // what we show in the list: the best human-readable name we have
      displayName:
        e.name || e.page_context.label || e.page_context.text || placeholder || e.html_id || "(no name)",
      disabled: e.page_context.disabled ?? false,
      formName: form ? form.id || form.name : null,
      locators: e.locator_candidates,
      recommendedLocator: e.locator_candidates.find((c) => c.recommended) ?? null,
    };
  });

const RequirementSchema = z.object({ id: z.string(), text: z.string() });

const snapshotSummaryFields = {
  id: z.number(),
  website_id: z.number(),
  previous_snapshot_id: z.number().nullable(),
  page_url: z.string(),
  test_type: z.string().nullable(),
  test_goal: z.string().nullable(),
  captured_at: z.string(),
  element_count: z.number(),
  has_screenshot: z.boolean(),
};

function toSummary(s: z.infer<z.ZodObject<typeof snapshotSummaryFields>>) {
  return {
    id: s.id,
    websiteId: s.website_id,
    previousSnapshotId: s.previous_snapshot_id,
    pageUrl: s.page_url,
    testType: s.test_type,
    testGoal: s.test_goal,
    capturedAt: s.captured_at,
    elementCount: s.element_count,
    hasScreenshot: s.has_screenshot,
    // the scope is saved once the tester picked a test type
    hasScope: s.test_type !== null,
  };
}

export const SnapshotSummarySchema = z.object(snapshotSummaryFields).transform(toSummary);
export const SnapshotSummaryListSchema = z.array(SnapshotSummarySchema);

export const SnapshotDetailSchema = z
  .object({
    ...snapshotSummaryFields,
    selected_element_ids: z.array(z.number()).nullable(),
    confirmed_requirements: z.array(RequirementSchema).nullable(),
    elements: z.array(ElementSchema),
  })
  .transform((s) => ({
    ...toSummary(s),
    selectedElementIds: s.selected_element_ids ?? [],
    requirements: s.confirmed_requirements ?? [],
    elements: s.elements,
  }));

export type TestType = (typeof TEST_TYPES)[number];
export type InspectRequest = z.input<typeof InspectRequestSchema>;
export type ScopeRequest = z.input<typeof ScopeRequestSchema>;
export type InspectedElement = z.infer<typeof ElementSchema>;
export type SnapshotSummary = z.infer<typeof SnapshotSummarySchema>;
export type SnapshotDetail = z.infer<typeof SnapshotDetailSchema>;
