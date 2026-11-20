# Fix It authentication

The frontend uses React Query for requests, Zod for API validation, and Zustand for the current session. There is no backend implementation yet.

## Configuration

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the FastAPI origin, for example `http://localhost:8000`. Restart Next.js after changing it. The FastAPI server must allow the frontend origin through CORS, including the `Content-Type` and `Authorization` headers and GET/POST methods.

## Expected backend contract

These are the frontend's proposed endpoints, to implement in FastAPI:

`POST /api/auth/login` accepts JSON:

```json
{ "email": "tester@example.com", "password": "your-password" }
```

Successful response:

```json
{ "access_token": "<JWT>", "token_type": "bearer" }
```

An optional `user` field may contain the same object as the current-user response. This endpoint accepts JSON; if you use FastAPI's `OAuth2PasswordRequestForm`, change the request to URL-encoded `username` and `password` in `lib/auth-api.ts`.

`GET /api/auth/current-user` receives `Authorization: Bearer <JWT>` and returns:

```json
{ "id": 1, "email": "tester@example.com", "full_name": "Test User" }
```

`id` may be a string or number; `full_name` is optional and may be null. API fields are normalized to camelCase in `lib/auth.ts`. Failure responses use non-2xx HTTP status codes and FastAPI's `detail` field (string or validation-error array). `message` and `error` string fields are also supported.

## File responsibilities

- `components/auth/login-form.tsx`: client form, local input state, loading/error UI, and navigation home after success.
- `hooks/api/use-login.ts`: login mutation, session update after a valid response, profile query, and session clearing on profile HTTP 401. Queries only run when there is a token. Login cancels and removes old queries before installing a new session.
- `stores/user-info-store.ts`: canonical client-side Zustand store. `setSession` sets the token and sign-in flag together; `setUserInfo` updates the profile; `clearUserInfo` clears the complete local session. Components select values using `useUserInfoStore((state) => state.isSignedIn)`.
- `lib/auth.ts`: request/response schemas and their inferred TypeScript types.
- `lib/auth-api.ts`: framework-independent login/profile requests and response validation.
- `lib/api-client.ts`: configurable API origin, JSON decoding, and HTTP/network errors.
- `app/providers.tsx`: one React Query client per mounted app, plus profile synchronization after login.
- `app/auth/login/page.tsx`: route entry that renders the form. `app/auth/layout.tsx` provides the shared site header/footer.

Flow: form → login mutation → API validation → Zustand session → navigation home. The session then enables the profile query, which sends the bearer token.

## Session lifetime

Tokens, passwords, and profiles are not written to localStorage. The old persisted boolean was removed because it could claim a user was signed in without any valid token. Refreshing the page signs the user out. A persistent login will need a backend refresh-session design. Clearing the frontend store does not revoke a JWT already issued by the server. The backend must validate tokens and enforce authorization; Zustand only drives the UI.

## Validation

Run `npm run test:auth` for mocked API and store tests. The backend must be implemented to test real authentication. Empty workspace/registration routes elsewhere in the project currently prevent a full-project TypeScript check from passing.
