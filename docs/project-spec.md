# Human-in-the-Loop Web Testing Assistant (Fix It): Requirements & Design Specification

This document consolidates the requirements and rubric from the TA Project Brief (`GenAI_Fall26_project.pdf`) and the team design report (`Testing_Assistant_Project_Report.pdf`, 09 November 2026).

**Revision 2026-11-20:** sections 4–7 were updated to match the implemented Phase 1 backend (`Backend/`, `runner/`) and the actual frontend layout (`Frontend/my-app/`). Section 0 lists every deviation from the original design. Where this document and the code disagree, the code is the reference and this document should be fixed.

---

## 0. Changes from the original design (as implemented)

| Area | Original spec | Implemented |
| :--- | :--- | :--- |
| Repo layout | `testing-assistant/{backend,frontend,runner}` | `Fix-It/{Backend,Frontend/my-app,runner}` |
| Frontend source root | `frontend/src/...` | `Frontend/my-app/...` (no `src/`) |
| Auth routes | Route group `(auth)` → `/login`, `/register` | Real segment `app/auth/` → `/auth/login`, `/auth/register` |
| Frontend API layer | `src/lib/api/*.ts` + `src/types/*.ts` | `lib/<area>-api.ts` (requests) + `lib/<area>.ts` (Zod schemas and inferred types) + `hooks/api/use-*.ts` (React Query hooks) + `stores/` (Zustand) |
| Frontend libraries | Next.js, Tailwind, Monaco | Next.js 16.4, React 19.3, Tailwind 4.3, TanStack React Query 5, Zod 4, Zustand 5, `@monaco-editor/react` 4.7 |
| Inspection job model | Async job + status polling | **Synchronous**: `POST /websites/{id}/snapshots` blocks until the runner finishes (≤ `INSPECTION_TIMEOUT_SECONDS`, default 90 s) and returns the full snapshot. Async jobs + polling are still planned for test execution. |
| Runner | Separate service/container with Dockerfile, templates | Separate **OS process** started per job (`python -m runner_app.main <job.json>`), file-based job/result exchange in `runner/jobs/<uuid>/`. Only job type `inspect` exists. No Dockerfile or templates yet. |
| Runner HTTP client | `integrations/runner_client.py` talks to a service | `integrations/runner_client.py` spawns the subprocess, strips `JWT_SECRET`/`SQLALCHEMY_DATABASE_URL` from its environment, enforces one browser job at a time (in-process lock, `409` if busy) |
| Storage helper | `app/integrations/storage.py` | `app/storage.py` |
| Extra core module | — | `app/core/clock.py` (`utc_now_iso()`) |
| LLM router | `routers/chat.py` | `routers/llm.py` (models, summarize, usage); `chat.py` not yet built |
| `User.password_hash` | `password_hash` | Column is named `pw_hash`; `first_name` / `last_name` are nullable in the DB (required by the API) |
| `Snapshot` scope fields | `test_type`, `test_goal`, `confirmed_requirements` NOT NULL | **Nullable**: filled by `PUT /snapshots/{id}/scope` after inspection (migration `3f1a9c2b7d10`) |
| `Snapshot.selected_element_ids` | Not in spec | **Added** (JSON TEXT, nullable): element IDs chosen by the tester (migration `8b2d4e6f1a23`) |
| `Snapshot.previous_snapshot_id` | Set on rescan | Set automatically to the latest snapshot of the **same website and same `page_url`** |
| `Snapshot.screenshot_path` | Artifact reference | Path relative to `Backend/artifacts/`, e.g. `snapshots/7/screenshot.png` |
| `Snapshot.guideline_version` | Version reference | First 12 hex chars of SHA-256 of `common.md` + `<test_type>.md`, set when the model is called |
| Test types | `smoke`, `regression`, … | Exactly `smoke` and `regression` (Pydantic `Literal`) |
| Database file | `backend/data/` | `Backend/FixIt.db` (via `SQLALCHEMY_DATABASE_URL`) |
| Dependencies | `pyproject.toml` | `Backend/requirements.txt`, `runner/requirements.txt` |
| Login identifier | email | `identifier` = email (contains `@`) or username |

---

## 1. Project Overview & Core Objectives

### 1.1 High-Level Task
Build a web-based, human-in-the-loop assistant that helps a human tester:
1. Inspect a target webpage using a visible browser.
2. Design test cases collaboratively with the tester.
3. Generate executable Gherkin and Playwright Python code (using the Page Object Model).
4. Execute approved tests in an isolated runner.
5. Maintain and repair tests after the target webpage changes.
6. Track versions, diffs, restorations, and model/execution telemetry.

### 1.2 Core Philosophy & Human-in-the-Loop Principles
* **Supervised workflow at every stage:** findings, decisions, and results are understandable and reviewable. The tester guides inspection, clarifies expected behavior, edits test cases, reviews generated code, and approves proposed repairs.
* **Ask for clarification** whenever evidence is insufficient or several repair candidates are plausible.
* **Explicit approval gates:**
  1. Approval of selected test case revisions (test plan) before final code generation.
  2. Approval of the exact reviewed code bundle before execution (every rerun requires a fresh execution approval).
  3. Approval of proposed maintenance/locator repairs before applying patches.
* **Ground outputs in evidence:** reference observed elements; validate locators (including uniqueness); distinguish page observations from business-rule assumptions; use meaningful assertions; never weaken assertions to make a test pass. Changed expectations return to case review.
* **Prompt-injection hygiene:** webpage content is **data**, never instructions.

### 1.3 Models, Resources & Evaluation Environment
* **Free/open-source inference only.** Paid model APIs or subscriptions are prohibited.
* Document model(s), versions/digests, configuration, hardware or API setup, rate limits, and resource limits.
* Evaluation uses a small instructor-supplied website and a modified version of it. Inspection results must be retained so later steps refer to what was actually observed.
* Assessment focus: functional correctness, grounded outputs, useful human interaction, maintainable code, and the team's understanding (code discussions at both submissions). Speed, model size, or autonomy alone earn no extra marks.

---

## 2. Course Grading Rubric & Deliverables

**Total:** 30 points + up to 1 bonus point.

### 2.1 Phase 1: Architecture and Guided Inspection (Week 9, 10 points)

| Component | Requirements | Points |
| :--- | :--- | :---: |
| Architecture and system design | Component diagram and data flow (web UI, model integration, inspection/state storage, isolated browser runner). Approval points, validation, and how later phases use inspection results. | 4 |
| Working page inspection | Accept a URL, open a visible browser, extract interactive elements, labels/attributes, candidate locators. Display structured findings linked to the source page. | 3 |
| Basic human interaction | User specifies a testing goal and selects elements / refines the inspection scope through the interface. | 2 |
| Feasibility evidence | At least one meaningful model call using inspection data; record model/version, hardware/API setup, token usage, response time. | 1 |

Demonstration: open a supplied page, inspect, display findings, let the user choose a target or goal, and use the model to summarize selected elements or suggest a grounded next action.

Submission: short design document, runnable source + setup + model config (no secrets), short demo, sample inspection output, model usage/timing evidence.

### 2.2 Phase 2: Complete Supervised Workflow (Week 13, 20 points)

| Component | Requirements | Points |
| :--- | :--- | :---: |
| Collaborative test design | Cases grounded in inspected elements and user requirements, with actions and meaningful expected results. Editing, clarification, explicit approval. | 4 |
| Test implementation | Executable Playwright tests with POM. Validate syntax and verify locators against observed elements before execution. Allow code review. | 4 |
| Execution and review | Execute approved tests in an isolated runner with a visible browser. Pass/fail, screenshots, failure details. Feedback, revision, approved reruns. | 4 |
| Assisted maintenance | On rescan, compare stored inspection with modified page, flag changes, propose evidence-backed locator repairs, apply approved repairs preserving intent, clarify ambiguous matches. | 4 |
| Versioning and visibility | Versions of cases and code, text diffs, restore earlier version. Per-call token usage and response time, plus session/page average response time. | 2 |
| Integration and code defense | Reproducible setup; documentation of architecture, resources, limitations. Demonstrate and explain assistant code and generated tests. | 2 |

Required demo sequence: inspect → review/approve cases → review code → approve execution → inspect results → feedback, revise, rerun with fresh approval → rescan modified site, identify locator change, approve repair, rerun → ambiguous change with clarification → diff between versions → restore earlier version.

Submission: source + setup, model/resource config, architecture and limitations docs, approved cases and generated code, run evidence and model usage logs, end-to-end demo.

### 2.3 Optional Creative Work (+1 bonus)
Explain what was added, what problem it solves, and demonstrate it in the assistant. Model and resource rules still apply.

---

## 3. End-to-End Supervised User Workflow

1. **Sign in:** register or log in → dashboard.
2. **Dashboard:** website count, test pass rate, recent runs, sidebar of saved websites, URL input and `+` button.
3. **Inspect:** open the URL in a visible Playwright browser; screenshot preview with highlighted elements; save labels, attributes, and locator candidates into an immutable `Snapshot`.
4. **Choose scope:** select some or all elements, choose `smoke` or `regression`, describe the goal, list known requirements. Assistant asks in chat for missing expected behavior.
5. **Generate and review cases:** purpose, ordered steps, expected result; manual edits or chat changes.
6. **Approve cases (Gate 1).** Editing intent clears approval.
7. **Review code:** Gherkin and Python (with POM) views in Monaco; manual edits, model selection, chat revisions.
8. **Approve and run (Gate 2):** validate syntax, step bindings, locators; approve the exact frozen bundle; execute in the restricted runner. Every rerun needs a fresh approval.
9. **Review results:** passed/failed/skipped/errored, failure details, screenshots, traces, duration.
10. **Website history:** previous runs, new tests, saved tests.
11. **Maintain (Gate 3):** rescan → new linked `Snapshot`, compare, flag changes, propose repairs, clarify ambiguity, approve patch, rerun.
12. **Versions and usage:** diffs, restore as new revision, per-call tokens and response time, session/page average.

### 3.1 Page navigation
* `/auth/login` or `/auth/register` → `/dashboard`
* `/dashboard` → select website → `/websites/[websiteId]` (history)
  * → open old run → `/websites/[websiteId]/runs/[runId]`
  * → review for rerun → test-cases page (code view)
  * → new tests → inspect
  * → rescan → review changes and repairs / clarify → approve repair → code view
* `/dashboard` → enter URL, `+` → inspect → select elements, type, goal → generate and review cases
  * cases ↔ edit/chat/clarify; approve cases → code review
  * code review → intent change → cases; approve and run → run results
  * run results → revise → cases; return → dashboard

---

## 4. Technology Stack & Architecture

| Area | Technology | Status / notes |
| :--- | :--- | :--- |
| Frontend | Next.js 16.4 (App Router, `cacheComponents`), React 19.3, TypeScript | Auth done; other screens empty. Next 16 APIs differ from older versions; read `node_modules/next/dist/docs/` before writing pages. |
| Styling | Tailwind CSS 4.3 (via `@tailwindcss/turbopack`) | Theme tokens in `app/globals.css` (`hero`, `site-surface`, …) |
| Data fetching | TanStack React Query 5 | One `QueryClient` in `app/providers.tsx` |
| Validation (FE) | Zod 4 | Schemas convert snake_case API fields to camelCase at the boundary |
| Client state | Zustand 5 (`persist`) | Session token in localStorage key `fixit-session` |
| Code editing | `@monaco-editor/react` 4.7 | Installed; `components/testing/code-editor.tsx` still to build |
| Backend API | FastAPI + Pydantic v2 + pydantic-settings | Implemented for auth, websites, snapshots, LLM |
| Auth | bcrypt password hashing, PyJWT HS256 bearer tokens | Expiry `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60), no refresh token |
| Database | SQLite + SQLAlchemy | `Backend/FixIt.db` |
| Migrations | Alembic | `initial_schema`, `snapshot_scope_nullable`, `snapshot_selected_elements` |
| Browser automation | Playwright Python (sync API) in the runner process | Headed by default (`RUNNER_HEADLESS=false`) |
| BDD execution | Behave + Playwright | Planned (Phase 2) |
| Model runtime | Ollama at `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`) | |
| Model | `qwen2.5-coder:7b` (default `OLLAMA_MODEL`); 1.5B fallback | Temperature 0.2, `num_ctx` 8192, timeout 180 s. Any installed Ollama model selectable via `GET /llm/models`. |
| Model client | HTTPX in `app/llm/client.py` | Structured output: JSON schema sent to Ollama, validated again with Pydantic |
| Artifacts | `Backend/artifacts/` | Screenshots now; bundles and traces later. Served only from inside this folder. |
| Runner | Per-job subprocess, `runner/runner_app/` | See section 4.2 |
| Progress | Synchronous for inspection; polling planned for runs | |

### 4.1 Ownership boundaries
* **FastAPI** owns all database writes, authentication, authorization (every query is scoped to the current user), and approval checks.
* **Runner** does browser work only and returns evidence as `result.json`; it never touches the database.
* **LLM adapter** (`app/llm/client.py`) is the only code that talks to Ollama. Every call is logged as an `LLMCall` row (success or error) by `llm_service.record_call`.
* **Guidelines** are Markdown files loaded by test type (`common.md` + `smoke.md`/`regression.md`); the hash becomes `Snapshot.guideline_version`.
* **Grounding check:** after a model call, `llm_service` warns when the answer references element IDs outside the tester's selection.

### 4.2 Runner protocol (implemented)
1. Backend creates `runner/jobs/<uuid>/job.json`, e.g. `{"type": "inspect", "url": "...", "headless": false, "timeout_ms": 30000}`.
2. Backend runs `python -m runner_app.main <job.json>` with `cwd=runner/`, using `RUNNER_PYTHON` or the backend's interpreter, with backend secrets removed from the environment.
3. `job_schema.validate_job` accepts only known job types (`inspect`), http(s) URLs, and `timeout_ms` in 1–120000.
4. Runner writes `result.json` (`ok`, `final_url`, `page_title`, `elements`, …) and `screenshot.png`.
5. Backend copies the screenshot to `artifacts/snapshots/<id>/`, saves `Snapshot` + `Element` rows, deletes the job folder.
6. Only one browser job runs at a time; a second request gets `409 Conflict`.
7. Target restriction: the inspected page must have the same scheme and host as the registered website.

Still required for Phase 2: an `execute` job type, filesystem/command/network restrictions beyond process separation, and resource limits.

---

## 5. Database Schema

### 5.1 Conventions
* 10 tables; table names are PascalCase (`"User"`, `"Snapshot"`, …).
* `INTEGER` primary keys. NOT NULL unless marked Nullable.
* Timestamps: UTC ISO 8601 `TEXT` with milliseconds, from `app/core/clock.utc_now_iso()`.
* JSON fields: serialized `TEXT`, parsed back by Pydantic response schemas.
* Foreign keys indexed. `PRAGMA foreign_keys = ON` per connection is **required but not yet implemented** in `app/db/session.py` (SQLite does not enforce FKs without it).
* `Snapshot` and `Element` are immutable observations, except that the scope fields on `Snapshot` (`test_type`, `test_goal`, `confirmed_requirements`, `selected_element_ids`, `guideline_version`) are written after inspection. A rescan creates a new `Snapshot`.
* Each `TestCase` row is an immutable revision; edits and restorations create new rows.

### 5.2 Tables

#### `User`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `first_name` | TEXT | Nullable in DB; required (1–50 chars) by the API |
| `last_name` | TEXT | Nullable in DB; required (1–50 chars) by the API |
| `username` | TEXT | UNIQUE; lower-cased, `^[a-z0-9_.-]{3,30}$` |
| `email` | TEXT | UNIQUE; lower-cased |
| `pw_hash` | TEXT | bcrypt hash (password ≤ 72 UTF-8 bytes) |
| `joined_at` | TEXT | UTC |

#### `Website`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `user_id` | INTEGER | FK → `User.id` |
| `url` | TEXT | Normalized: lower-case scheme/host, trailing `/` removed, fragment dropped, query kept |
| `display_name` | TEXT | Nullable; blank → NULL |
| `created_at` | TEXT | UTC |

`UNIQUE (user_id, url)`. Pass rate, last-tested time, etc. are derived.

#### `Snapshot`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `website_id` | INTEGER | FK → `Website.id` |
| `previous_snapshot_id` | INTEGER | Nullable FK → `Snapshot.id`; latest earlier snapshot of the same website and `page_url` |
| `page_url` | TEXT | Inspected page (same scheme/host as the website) |
| `test_type` | TEXT | **Nullable** until scope is set; `smoke` or `regression` |
| `test_goal` | TEXT | **Nullable** until scope is set; 3–2000 chars |
| `confirmed_requirements` | TEXT (JSON) | **Nullable**; list of requirement objects |
| `selected_element_ids` | TEXT (JSON) | **Nullable; added.** IDs of elements the tester selected (all IDs when `select_all`) |
| `guideline_version` | TEXT | Nullable; 12-char guideline hash |
| `captured_at` | TEXT | UTC |
| `screenshot_path` | TEXT | Nullable; relative to `Backend/artifacts/` |

#### `Element`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `snapshot_id` | INTEGER | FK → `Snapshot.id` |
| `html_id` | TEXT | Nullable |
| `name` | TEXT | Nullable accessible name |
| `role` | TEXT | Nullable computed role |
| `tag_name` | TEXT | |
| `attributes` | TEXT (JSON) | Observed attributes; typed field values are never stored (`value` kept only for buttons/checkbox/radio) |
| `locator_candidates` | TEXT (JSON) | Ordered list of `{strategy, code, match_count, unique, matches_element, recommended}`; preference: `test_id` → `role` → … → CSS |
| `page_context` | TEXT (JSON) | `{page_url, page_title, frame, index, text, label, form{id,name,action,method}, disabled, has_click_handler, bounding_box{x,y,width,height}}` (box in page coordinates; kept as evidence, not used by the list-based UI) |

#### `TestCase`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | PK (exact revision) |
| `snapshot_id` | INTEGER | FK → `Snapshot.id` |
| `logical_case_id` | TEXT | Stable UUID across revisions |
| `version_no` | INTEGER | > 0 |
| `previous_version_id` | INTEGER | Nullable FK → `TestCase.id` |
| `purpose` | TEXT | |
| `steps` | TEXT (JSON) | Ordered actions and evidence references |
| `expected_result` | TEXT | |
| `gherkin_code` | TEXT | Default `""` |
| `python_code` | TEXT | Default `""` |
| `page_object_code` | TEXT | Nullable |
| `approved_at` | TEXT | Nullable; Gate 1 |
| `created_at` | TEXT | UTC |

`UNIQUE (logical_case_id, version_no)`.

#### `TestCaseElement`
Composite PK (`test_case_id` FK → `TestCase.id`, `element_id` FK → `Element.id`). Both rows must belong to the same snapshot (enforce in service code).

#### `TestRun`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `snapshot_id` | INTEGER | FK → `Snapshot.id` |
| `status` | TEXT | `queued`, `running`, `completed`, `error`, `cancelled` (CHECK) |
| `approved_by` | INTEGER | FK → `User.id` |
| `approved_at` | TEXT | Gate 2 |
| `created_at` | TEXT | |
| `started_at`, `finished_at` | TEXT | Nullable |
| `code_bundle_path` | TEXT | Frozen bundle incl. POM |
| `code_bundle_hash` | TEXT | Hash of approved bundle |
| `report` | TEXT (JSON) | Nullable |

#### `TestResult`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `run_id` | INTEGER | FK → `TestRun.id` |
| `test_case_id` | INTEGER | FK → `TestCase.id` (exact revision) |
| `status` | TEXT | `pending`, `running`, `passed`, `failed`, `skipped`, `error`, `cancelled` (CHECK) |
| `error_message`, `actual_result` | TEXT | Nullable |
| `duration_ms` | INTEGER | Nullable, ≥ 0 (CHECK) |
| `screenshot_path`, `trace_path` | TEXT | Nullable |

`UNIQUE (run_id, test_case_id)`.

#### `LLMCall`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `snapshot_id` | INTEGER | FK → `Snapshot.id` |
| `model_name` | TEXT | e.g. `qwen2.5-coder:7b` |
| `model_version` | TEXT | Ollama digest |
| `purpose` | TEXT | `inspection`, `cases`, `code`, `revision`, `repair` (CHECK) |
| `input` | TEXT | Prompt sent |
| `output` | TEXT | Nullable |
| `timestamp` | TEXT | UTC |
| `duration_ms` | INTEGER | ≥ 0 |
| `input_tokens`, `output_tokens` | INTEGER | Nullable, ≥ 0 |
| `token_count_source` | TEXT | `runtime`, `estimated`, `unavailable` (CHECK) |
| `status` | TEXT | `success`, `error`, `cancelled` (CHECK) |
| `error_message` | TEXT | Nullable |

#### `ChatMessage`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `snapshot_id` | INTEGER | FK → `Snapshot.id` |
| `sequence_no` | INTEGER | |
| `role` | TEXT | `user`, `assistant` (CHECK) |
| `content` | TEXT | |
| `llm_call_id` | INTEGER | Nullable FK → `LLMCall.id` |
| `created_at` | TEXT | |

`UNIQUE (snapshot_id, sequence_no)`.

### 5.3 Relationships
User 1–N Website; Website 1–N Snapshot; Snapshot 1–N Element, TestCase, TestRun, LLMCall, ChatMessage; Snapshot 0..1 previous Snapshot; TestCase N–M Element; TestRun 1–N TestResult; TestCase 1–N TestResult; User 1–N TestRun (approver); LLMCall 1–N ChatMessage.

---

## 6. API (implemented)

All endpoints except register/login/health need `Authorization: Bearer <JWT>`. Errors return `{"detail": ...}`. No `/api` prefix.

| Method & path | Body → response | Notes |
| :--- | :--- | :--- |
| `GET /health` | → `{status}` | |
| `POST /auth/register` | `{first_name, last_name, username, email, password}` → user (201) | 409 on duplicate |
| `POST /auth/login` | `{identifier, password}` → `{access_token, token_type}` | identifier = email or username |
| `GET /auth/me` | → user | |
| `POST /websites` | `{url, display_name?}` → website (201) | URL normalized; duplicate → 409 |
| `GET /websites` | → website[] | Current user only |
| `GET /websites/{id}` | → website | |
| `PATCH /websites/{id}` | `{display_name}` → website | |
| `POST /websites/{id}/snapshots` | `{page_url?}` → `SnapshotDetail` (201) | **Blocking** inspection; 409 if a browser job is running |
| `GET /websites/{id}/snapshots` | → `SnapshotSummary[]` | |
| `GET /snapshots/{id}` | → `SnapshotDetail` | Includes all elements |
| `PUT /snapshots/{id}/scope` | `{test_type, test_goal, select_all, element_ids[], requirements[]}` → `SnapshotDetail` | Needs `select_all` or at least one ID |
| `GET /snapshots/{id}/screenshot` | → PNG | |
| `GET /llm/models` | → `{default_model, models[{name, digest, parameter_size, quantization, size_bytes}]}` | From Ollama |
| `POST /snapshots/{id}/summarize` | `{model?}` → `{summary, warnings[], call}` | purpose `inspection`; needs scope set |
| `GET /snapshots/{id}/llm-calls` | → `{call_count, successful_calls, average_duration_ms, total_input_tokens, total_output_tokens, calls[]}` | Page-level usage; average over successful calls |
| `GET /llm-calls/{id}` | → call incl. `input`/`output` | |

`SnapshotSummary`: `id, website_id, previous_snapshot_id, page_url, test_type, test_goal, captured_at, element_count, has_screenshot`. `SnapshotDetail` adds `selected_element_ids, confirmed_requirements, elements[]`.

`InspectionSummary` (model output): `page_summary`, `elements[{element_id, purpose}]`, `suggested_actions[{action, element_ids[], reason}]`, `questions_for_tester[]`.

Planned (Phase 2): dashboard metrics, test cases (generate/edit/approve/versions/diff/restore), chat, code generation and validation, runs (create with approval, status polling, results, artifacts), rescan comparison and repairs.

---

## 7. Repository Structure

Legend: ✅ implemented · 🟡 file exists but empty or placeholder · ⬜ planned, not created.

```text
Fix-It/
├── README.md
├── LICENSE
├── docs/project-spec.md                 ✅ this file
├── GenAI_Fall26_project.pdf, Testing_Assistant_Project_Report.pdf, Web_Testing_Assistant_Architecture.pdf
├── Backend/
│   ├── .env / .env.example              ✅ (.env must be git-ignored; currently tracked, fix)
│   ├── requirements.txt                 ✅
│   ├── alembic.ini, migrations/         ✅ 3 revisions
│   ├── FixIt.db                         ✅ SQLite (should be git-ignored; currently tracked)
│   ├── artifacts/snapshots/<id>/        ✅ screenshots (should be git-ignored; currently tracked)
│   ├── tests/                           ⬜
│   └── app/
│       ├── main.py                      ✅ CORS, AppError handler, routers
│       ├── storage.py                   ✅ artifact paths
│       ├── core/  config.py security.py exceptions.py clock.py   ✅
│       ├── db/    base.py session.py    ✅
│       ├── models/  user website snapshot element test_case(+TestCaseElement) test_run test_result llm_call chat_message   ✅
│       ├── schemas/ auth website snapshot llm   ✅   test_case test_run chat   ⬜
│       ├── routers/ auth websites snapshots llm dependencies   ✅   dashboard test_cases test_runs chat   ⬜
│       ├── services/ auth website inspection llm   ✅   dashboard test_case execution maintenance chat   ⬜
│       ├── llm/
│       │   ├── client.py prompt_builder.py guidelines.py schemas.py   ✅
│       │   ├── prompts/ inspect.md generate_cases.md generate_code.md   ✅   revise_tests.md repair_locators.md   ⬜
│       │   └── guidelines/ common.md smoke.md regression.md   ✅
│       └── integrations/runner_client.py   ✅
├── runner/
│   ├── requirements.txt                 ✅
│   ├── jobs/                            ✅ ephemeral (git-ignored)
│   ├── Dockerfile, templates/*.j2       ⬜
│   └── runner_app/
│       ├── main.py job_schema.py inspector.py   ✅
│       └── executor.py validation.py evidence.py   ⬜
└── Frontend/my-app/
    ├── package.json, tsconfig.json, next.config.ts, eslint.config.mjs   ✅
    ├── .env.example                     ✅ NEXT_PUBLIC_API_URL
    ├── AGENTS.md                        ✅ Next 16 notice (auto-generated)
    ├── docs/auth.md                     ✅
    ├── tests/auth.test.ts websites.test.ts snapshots.test.ts llm.test.ts   ✅ (npm test)
    ├── public/                          ✅
    ├── app/
    │   ├── layout.tsx providers.tsx globals.css page.tsx   ✅
    │   ├── auth/ layout.tsx login/page.tsx register/page.tsx   ✅
    │   └── (workspace)/
    │       ├── layout.tsx (auth guard), error.tsx   ✅
    │       ├── loading.tsx                          🟡
    │       ├── dashboard/page.tsx                   ✅ URL form, website count, pass-rate placeholder
    │       └── websites/[websiteId]/
    │           ├── page.tsx                         ✅ website details + rename (Suspense + useParams)
    │           ├── snapshots/[snapshotId]/inspect/page.tsx      ✅ element list + scope form
    │           ├── snapshots/[snapshotId]/test-cases/page.tsx   🟡 placeholder
    │           └── runs/[runId]/page.tsx            🟡 placeholder
    ├── components/
    │   ├── auth/ login-form register-form           ✅
    │   ├── layout/ site-header site-footer website-sidebar workspace-header (sign out)   ✅
    │   ├── websites/ website-details snapshot-list   ✅
    │   ├── ui/ button input select modal            🟡
    │   ├── dashboard/ website-url-form metric-card   ✅   recent-runs   🟡
    │   ├── inspection/ new-inspection-form inspection-workspace element-selector test-options-form   ✅
    │   ├── testing/ test-case-workspace test-case-card code-editor version-history approval-controls   🟡
    │   ├── chat/ model-selector   ✅   chat-panel message-list   🟡
    │   ├── llm/ model-summary-panel llm-usage-panel   ✅ (summary + per-call tokens/time + page average)
    │   └── results/ run-summary case-result-card evidence-viewer   🟡
    ├── hooks/api/ use-login.ts use-register.ts use-websites.ts use-snapshots.ts use-llm.ts   ✅   (add use-run-status …)
    ├── lib/ api-client.ts auth.ts auth-api.ts websites.ts websites-api.ts snapshots.ts snapshots-api.ts llm.ts llm-api.ts formatters.ts   ✅
    └── stores/user-info-store.ts                  ✅
```

### 7.1 Frontend conventions
* `lib/<area>.ts`: Zod schemas for requests/responses, converting snake_case to camelCase, plus `z.infer` types.
* `lib/<area>-api.ts`: plain async functions using `apiRequest`, attaching the bearer token, and validating responses.
* `hooks/api/use-<area>.ts`: React Query `useQuery`/`useMutation` wrappers, reading the token from `useUserInfoStore`.
* Workspace pages are client-guarded by `app/(workspace)/layout.tsx`.

### 7.2 Frontend route map
| URL | Screen |
| :--- | :--- |
| `/` | Landing page |
| `/auth/login` | Login |
| `/auth/register` | Registration |
| `/dashboard` | Website sidebar, metrics, recent runs, URL input |
| `/websites/[websiteId]` | Website history (snapshots, runs, rescan) |
| `/websites/[websiteId]/snapshots/[snapshotId]/inspect` | List of observed elements (name, tag/role, recommended locator, all candidates with match counts) with checkboxes, Select all / Clear, filter; scope form (test type, goal, requirements). Below: model selector + "Summarize selection" (after scope is saved) and the page's model usage table (per-call tokens, token source, response time, average, prompt/answer). |
| `/websites/[websiteId]/snapshots/[snapshotId]/test-cases` | Cases, Gherkin/Python/POM editors (Monaco), diffs, chat |
| `/websites/[websiteId]/runs/[runId]` | Run results and evidence |

---

## 8. Implementation Rules & Checklist

1. **Evidence first:** test actions reference observed `Element` rows; expectations come from `confirmed_requirements`; ask in chat when information is missing.
2. **Enforce approvals:** `TestCase.approved_at` (Gate 1) → `TestRun.approved_at` + `code_bundle_hash` (Gate 2) → explicit repair approval (Gate 3).
3. **Keep code aligned:** every Gherkin step has a Behave step; use POM; validate syntax, bindings, and locators against observed elements before running.
4. **Preserve real failures:** repairs change locators only, using new-snapshot evidence; changed expectations return to case review.
5. **Isolate the runner:** restrict target URLs (same-site check exists), filesystem, host commands, and compute. The current subprocess with stripped secrets is a start, not sufficient for Phase 2.
6. **Exact run history:** each `TestResult` binds to an exact `TestCase` revision; each `TestRun` to a frozen bundle path + hash; block duplicate run requests.
7. **Pass rate:** `passed / (passed + failed) × 100`; show `error` and `skipped` separately; show "No results" when `passed + failed = 0`.
8. **Separate timing:** `LLMCall.duration_ms` is model time; `TestRun`/`TestResult` durations are browser time. Show per-call tokens and time and the page average (`GET /snapshots/{id}/llm-calls`). Label `estimated`/`unavailable` token counts. Exclude cached results from averages.
9. **Long-running jobs:** test execution must return a run ID immediately and be polled (`use-run-status`). Inspection is currently synchronous by decision (single page, ≤ 90 s, one browser job at a time); the frontend must show a blocking progress state and handle `409` and timeout errors. Interrupted runs must end as `error` or `cancelled`.
10. **Model benchmarking:** pull models before demos; record model name, digest, hardware, tokens, latency for `qwen2.5-coder:7b` and the 1.5B fallback.
11. **Build sequence and status:**
    * Step 1: auth ✅, websites ✅ (backend + frontend), dashboard ✅ (metrics from runs pending).
    * Step 2: inspection and element/goal selection ✅ (backend + frontend). Decision: the UI shows an element **list** with checkboxes instead of a screenshot overlay; the screenshot is still saved as evidence.
    * Step 3: model summary and usage/timing display ✅ (backend + frontend, completes Phase 1); case generation, chat, Gate 1 ⬜.
    * Step 4: code generation, validation, Monaco review, Gate 2, execution ⬜ (Monaco installed).
    * Step 5: history, diffs, restore, rescan comparison and repairs, Gate 3, usage dashboards ⬜.
