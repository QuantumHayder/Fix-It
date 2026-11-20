# Fix It authentication

The frontend uses React Query for requests, Zod for API validation, and Zustand for the current session. Authentication is implemented in the FastAPI backend (`Backend/app/routers/auth.py`, `Backend/app/services/auth_service.py`).

## Configuration

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the FastAPI origin, for example `http://localhost:8000` (no `/api` prefix; paths are appended by `lib/api-client.ts`). Restart Next.js after changing it.

The backend allows the frontend through CORS using `FRONTEND_ORIGIN` in `Backend/.env` (default `http://localhost:3000`). Tokens are HS256 JWTs signed with `JWT_SECRET` and expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60).

## Backend contract

All bodies are JSON. Errors use non-2xx status codes with FastAPI's `detail` field (a string, or a validation-error array); `lib/api-client.ts` turns both into an `ApiError` with the HTTP status.

### `POST /auth/register` → `201`

```json
{
  "first_name": "Test",
  "last_name": "User",
  "username": "tester",
  "email": "tester@example.com",
  "password": "at-least-8-chars"
}
```

- `username`: 3–30 characters of `a-z 0-9 _ . -`, lower-cased by the server.
- `email`: lower-cased by the server.
- `password`: 8+ characters and at most 72 UTF-8 bytes (bcrypt limit).
- `409` when the username or email is already registered.

Returns the user object (no token):

```json
{ "id": 1, "first_name": "Test", "last_name": "User", "username": "tester", "email": "tester@example.com", "joined_at": "2026-11-20T10:00:00.000+00:00" }
```

### `POST /auth/login` → `200`

```json
{ "identifier": "tester@example.com", "password": "your-password" }
```

`identifier` is either the email (if it contains `@`) or the username. Response:

```json
{ "access_token": "<JWT>", "token_type": "bearer" }
```

The backend does not return `user` here; `LoginResponseSchema` accepts an optional `user` field but it is currently always `null`. Wrong credentials return `401` with `"Invalid username/email or password"`.

### `GET /auth/me` → `200`

Send `Authorization: Bearer <JWT>`. Returns the same user object as registration. An invalid or expired token returns `401`.

API fields are converted to camelCase (`firstName`, `lastName`, `fullName`, `joinedAt`, …) once, in `lib/auth.ts`.

## File responsibilities

- `components/auth/login-form.tsx`, `components/auth/register-form.tsx`: client forms, local input state, loading/error UI, and `router.replace("/dashboard")` after success.
- `hooks/api/use-login.ts`: `useLogin` mutation and `useGetCurrentUserInfo` profile query (`GET /auth/me`). Login cancels and removes all cached queries before installing the new session. A `401` from the profile query clears the session.
- `hooks/api/use-register.ts`: registers, then immediately logs in with the same email and password (registration returns no token), then installs the session like login.
- `stores/user-info-store.ts`: Zustand store. `setSession(token, user?)` sets the token and sign-in flag together; `setUserInfo(user)` updates the profile only while a token exists; `clearSession()` clears everything.
- `lib/auth.ts`: request/response Zod schemas and inferred types.
- `lib/auth-api.ts`: framework-independent `register`, `login`, and `getCurrentUserInfo` requests with response validation.
- `lib/api-client.ts`: API origin, JSON decoding, and HTTP/network errors.
- `app/providers.tsx`: one React Query client per app, rehydrates the stored session after mount, and runs the profile query.
- `app/auth/login/page.tsx`, `app/auth/register/page.tsx`: route entries (`/auth/login`, `/auth/register`). `app/auth/layout.tsx` adds the site header and footer.
- `app/(workspace)/layout.tsx`: guards workspace pages; redirects to `/auth/login` once the store has rehydrated and there is no session.

Flow: form → mutation → API validation → Zustand session → `/dashboard`. The token then enables `GET /auth/me`, which fills in the profile.

## Session lifetime

The store uses Zustand `persist` under the localStorage key `fixit-session`. Only `accessToken` and `isSignedIn` are saved; the profile is fetched again from `/auth/me` on load. Rehydration is manual (`skipHydration: true`, called in `Providers`) so the server and first client render match; `hasHydrated` tells the workspace guard when it can decide.

So refreshing the page keeps the user signed in until the JWT expires. After expiry, `/auth/me` returns `401` and the session is cleared. There is no refresh token.

Security notes: a token in localStorage can be read by XSS, which is accepted for this project. Clearing the store does not revoke a JWT already issued. The backend validates the token on every protected request; Zustand only drives the UI.

There is no sign-out button yet; it should call `clearSession()`, clear the React Query cache, and navigate to `/auth/login`.

## Validation

Run `npm run test:auth` for mocked API and store tests (12 tests; `fetch` is mocked, no backend needed). The tests set `NEXT_PUBLIC_API_URL` themselves. The `[zustand persist middleware] … storage is currently unavailable` warnings are expected, because Node has no `localStorage`.

`tsx` needs esbuild's install script. On a fresh clone with npm's install-script approvals, `package.json` already allows `esbuild@0.28.2`; if npm still warns, run `npm install-scripts approve esbuild --all` and then `npm rebuild esbuild`.
