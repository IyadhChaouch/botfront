# Implementation Plan: Auth Views

## Overview

This plan builds the frontend authentication experience for the existing Next.js (`botfront`) app incrementally, from the inside out: shared types first, then the pure leaf modules (Session_Store, validation, error mapping) that the property-based tests target, then the API_Client auth methods and the Auth_Context that compose them, and finally the views, Route_Guard, header logout control, and the layout wiring that integrates everything.

Each step builds on the previous one and ends wired into the app — no orphaned code. Property-based tests use **fast-check** at a minimum of 100 iterations and follow the tagging convention in `src/components/DatasetCard.property.test.tsx` (`// Feature: auth-views, Property <n>: ...` plus a `Validates: Requirements X.Y` line). Test sub-tasks are marked optional with `*`.

## Tasks

- [x] 1. Add auth data models and types
  - [x] 1.1 Add auth types to `src/lib/types/index.ts`
    - Add `AuthUser`, `AuthSession`, `LoginPayload`, `RegisterPayload`, `RegisterResult`
    - Add `FieldErrorKey`, `ValidationResult`, and `AuthContextValue`
    - Keep additions consistent with the existing exported type style in the file
    - _Requirements: 4.4, 8.2_

- [x] 2. Implement the Session_Store
  - [x] 2.1 Implement `src/lib/auth/session-store.ts`
    - Define `STORAGE_KEY = "mgb-auth"` (mirrors the `mgb-*` key convention in `preferences.tsx`)
    - Implement `serializeSession`, `parseSession` (with the `isCompleteUser` guard rejecting partial/malformed records), `readSession`, `writeSession` (returns `false` on unavailable/quota-exceeded `localStorage`, never throws), and `clearSession`
    - _Requirements: 4.1, 4.6, 4.7, 8.8, 8.9_

  - [ ]* 2.2 Write property test for session round-trip
    - **Property 6: Session persistence round-trips**
    - Generate valid `AuthSession` records (non-empty token + complete `AuthUser`); assert `parseSession(serializeSession(s))` deeply equals `s`
    - File: `src/lib/auth/session-store.property.test.ts`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 4.1, 4.2, 8.8**

  - [ ]* 2.3 Write property test for malformed/empty/partial records
    - **Property 7: Malformed, empty, or partial stored records yield no session**
    - Use the "well-formed vs one-mutation-broken" generator technique (missing fields, wrong types, non-JSON, empty, token-only, user-only); assert `parseSession` returns `null`
    - File: `src/lib/auth/session-store.malformed.property.test.ts`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 4.7, 8.1, 8.9**

  - [ ]* 2.4 Write unit tests for write/clear behavior
    - `writeSession` returns `false` when `localStorage.setItem` throws (quota/unavailable) without throwing; `clearSession` removes the key
    - _Requirements: 4.6, 4.7_

- [x] 3. Implement pure field validation
  - [x] 3.1 Implement `src/lib/auth/validation.ts`
    - Define `EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/`
    - Implement `isBlank`, `isValidEmail`, `validateLogin` (username/password 1–254, non-whitespace), and `validateRegister` (username 1–150, email pattern, password 8–128), each returning the offending `FieldErrorKey` for every violated field
    - _Requirements: 1.1, 1.5, 2.2, 2.5, 2.6, 2.7_

  - [ ]* 3.2 Write property test for login validation
    - **Property 1: Login validation accepts exactly the well-formed credentials**
    - Generate trimmed/padded strings including lengths >254; assert acceptance and rejection are exact complements
    - File: `src/lib/auth/validation.login.property.test.ts`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 1.1, 1.2, 1.5**

  - [ ]* 3.3 Write property test for registration validation
    - **Property 2: Registration validation rejects out-of-bounds input and identifies the offending field**
    - Generate inputs across all bounds; assert `{ ok: true }` iff all fields valid, else `errors` contains every violated field key
    - File: `src/lib/auth/validation.register.property.test.ts`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 2.2, 2.5, 2.6**

  - [ ]* 3.4 Write property test for the email matcher
    - **Property 3: Email acceptance matches the specified pattern**
    - Generate valid (`local@domain.tld`) and invalid (missing `@`, missing dot, empty parts, embedded spaces) forms; assert `isValidEmail` matches the pattern exactly
    - File: `src/lib/auth/validation.email.property.test.ts`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 2.7**

  - [ ]* 3.5 Write unit tests for validation edge cases
    - Whitespace-only fields, exact boundary lengths (1, 8, 128, 150, 254), multi-field violations
    - _Requirements: 1.5, 2.5, 2.6, 2.7_

- [x] 4. Implement auth error mapping
  - [x] 4.1 Implement `src/lib/auth/errors.ts`
    - Implement `mapAuthError(error, view)` per the Requirement 3 status table: non-`ApiError`/network sentinel → network key; 401 → invalid-credentials; 409 → already-exists; 400 with non-empty body → detail key (truncated to 200 chars); 400 empty/absent → invalid-data; other non-2xx → status key with the code
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.6_

  - [ ]* 4.2 Write property test for error mapping totality
    - **Property 4: Auth-error mapping is total and status-correct**
    - Generate non-`ApiError` values, the network sentinel, and statuses partitioned into `{400, 401, 409}` and "other non-2xx"; assert exactly one correct descriptor each
    - File: `src/lib/auth/errors.property.test.ts`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6, 7.6**

  - [ ]* 4.3 Write property test for 400 detail truncation
    - **Property 5: 400 error detail is surfaced truncated to at most 200 characters**
    - Generate HTTP 400 `ApiError` with arbitrary-length non-empty bodies; assert `detail` equals the first 200 chars and never exceeds 200
    - File: `src/lib/auth/errors.truncate.property.test.ts`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 3.3**

  - [ ]* 4.4 Write unit tests for mapping examples
    - One concrete example per branch including the `login` vs `register` view distinction
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

- [x] 5. Checkpoint - pure modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Extend the API_Client with auth methods
  - [x] 6.1 Add auth transport to `src/lib/api/client.ts`
    - Add the injectable token provider (`getToken`, `setAuthTokenProvider`), `authHeaders` (attaches `Bearer <token>` only when a non-empty token is held), and `fetchJson` with an `AbortController` timeout that rethrows aborts/network failures as the `ApiError(0, "network")` sentinel
    - Add `login` (10s), `register` (30s), and `logout` (10s) methods; each parses/validates the in-range body and throws `ApiError(status, "invalid response")` on a malformed/partial 2xx body, throws `ApiError(status, message)` on out-of-range status, and returns no session on any failure
    - _Requirements: 4.3, 4.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 6.2 Write property test for the Authorization header builder
    - **Property 8: Authorization header is present iff a token is held**
    - Generate token values; assert `authHeaders` includes `Authorization: "Bearer " + token` for non-empty strings and omits the key for `null`/empty
    - File: `src/lib/api/client.authHeaders.property.test.ts`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 4.3, 4.8**

  - [ ]* 6.3 Write property test for non-2xx responses
    - **Property 10: Non-2xx auth responses throw an ApiError carrying the status and return no session**
    - Mock `fetch` across out-of-range statuses (with/without body message); assert thrown `ApiError.status` equals the code, message is non-empty, and no session is returned
    - File: `src/lib/api/client.nonok.property.test.ts`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 7.4, 7.5**

  - [ ]* 6.4 Write property test for in-range invalid bodies
    - **Property 13: In-range responses with an invalid body throw an ApiError and return no session**
    - Generate 200-299 statuses with non-JSON, non-object, and (for login) token/user-missing bodies; assert `ApiError "invalid response"` and no session
    - File: `src/lib/api/client.invalidbody.property.test.ts`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 1.9, 7.7**

  - [ ]* 6.5 Write unit tests for auth method happy paths and timeouts
    - login/register/logout success across the 200-299 range, header inclusion on logout, and network/timeout → network `ApiError`
    - _Requirements: 7.1, 7.2, 7.3, 7.6_

- [x] 7. Implement the Auth_Context provider
  - [x] 7.1 Implement `src/lib/auth/context.tsx`
    - `"use client"` provider mirroring `PreferencesProvider`: `token`/`user`/`status`/`persistError` state, mount `useEffect` restoring via `readSession` (clears partial/malformed), `setAuthTokenProvider` wiring, and `login`/`register`/`logout` actions; derive `isAuthenticated`; persist on login (flag `persistError` when `writeSession` returns `false`); clear session in a `finally` on logout; export `useAuth()`
    - _Requirements: 4.1, 4.2, 4.5, 8.1, 8.2, 8.3, 8.4, 8.6, 8.7, 8.8, 8.9_

  - [ ]* 7.2 Write property test for logout invariant
    - **Property 9: Logout always ends in a cleared session**
    - Drive `logout()` with a generated outcome (success / non-2xx / timeout / network); assert the context holds no token/user and the Session_Store is cleared
    - File: `src/lib/auth/context.logout.property.test.tsx`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 6.4, 6.5, 8.4**

  - [ ]* 7.3 Write property test for register/failure session preservation
    - **Property 11: Register success and any failed action leave the active session unchanged**
    - Generate initial session states and outcomes; assert successful `register` and any failed `login`/`register` leave the active session and Session_Store unchanged
    - File: `src/lib/auth/context.preserve.property.test.tsx`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 8.6, 8.7**

  - [ ]* 7.4 Write unit tests for context behavior
    - Restore-on-mount sets `ready`, `isAuthenticated` derivation, login sets+persists, `persistError` on write failure, partial stored session removed → unauthenticated
    - _Requirements: 4.4, 8.3, 8.8, 8.9_

- [x] 8. Checkpoint - state and transport
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Add localization dictionary entries
  - [x] 9.1 Add auth keys to `src/lib/preferences.tsx`
    - Add the `auth.*` label and error keys to both the `FR` and `AR` dictionaries (titles, field labels, submit/nav controls, logout, error messages, field-validation messages)
    - _Requirements: 9.1, 9.7_

  - [ ]* 9.2 Write property test for dictionary fallback
    - **Property 12: The bilingual dictionary never resolves to an empty label**
    - Generate label keys across locales; assert `useT()` (or the resolver it wraps) returns a non-empty string — locale entry, then FR fallback, then the key
    - File: `src/lib/preferences.dictionary.property.test.tsx`, `{ numRuns: 100 }` minimum
    - **Validates: Requirements 9.7**

- [x] 10. Implement the auth views and forms
  - [x] 10.1 Implement `src/components/auth/AuthErrorAlert.tsx`
    - `role="alert"` + `aria-live="assertive"` live region styled with Theme_Token classes; renders nothing when no message
    - _Requirements: 9.4, 9.5_

  - [x] 10.2 Implement `src/components/auth/LoginForm.tsx`
    - Field state, pending flag, validation via `validateLogin` before submit (clear prior error first), `auth.login` call, `mapAuthError` in `catch`, password `type="password"` + `maxLength={254}`, label-to-field association, navigation control to the Registration_View; clear password on 401, retain username on all failures, redirect to retained `?next=` path or home on success; re-enable in `finally`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 3.7, 5.6, 5.7, 9.3, 9.5_

  - [x] 10.3 Implement `src/components/auth/RegisterForm.tsx`
    - Analogous to LoginForm using `validateRegister`; on 201 navigate to `/login` with a confirmation flag, on 409 keep username+email with already-exists message, other failures keep username+email with generic message, navigation control to the Login_View
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 3.7, 9.3, 9.5_

  - [x] 10.4 Create the auth route pages
    - Add `src/app/(auth)/login/page.tsx` and `src/app/(auth)/register/page.tsx` rendering the forms wrapped by the Public-auth Route_Guard
    - _Requirements: 1.1, 2.1_

  - [ ]* 10.5 Write interaction tests for the Login_View
    - Pending disables/ignores resubmit, error cleared on resubmit, 401 clears password + keeps username, generic message on non-401 non-200 and malformed/partial 200, success navigation, navigation control to register
    - _Requirements: 1.3, 1.4, 1.6, 1.7, 1.8, 1.9, 1.11, 3.7_

  - [ ]* 10.6 Write interaction tests for the Registration_View
    - Pending state, 201 → login with confirmation, 409 retains username+email, generic failure retention, navigation control to login
    - _Requirements: 2.3, 2.4, 2.8, 2.9, 2.11, 2.12_

  - [ ]* 10.7 Write localization/accessibility tests for the views
    - FR/AR labels resolved, RTL for Arabic / LTR for French on the root container, label-for association, live-region error announcement, color-mode re-render preserving entered values
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.8_

- [x] 11. Implement the Route_Guard
  - [x] 11.1 Implement `src/components/auth/RouteGuard.tsx`
    - Read `status`/`isAuthenticated`; show a loader while restoring (5s cap) with no protected content; for protected routes redirect unauthenticated users to `/login?next=<path+query>`; for public-auth routes redirect authenticated users to home; issue redirects synchronously during render
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 11.2 Write unit tests for the Route_Guard
    - Unauthenticated → login with `next` carrying full path + query and no protected content, authenticated → renders protected, authenticated on auth route → home, restoring → loader with 5s cap
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 12. Wire the provider and logout control into the app
  - [x] 12.1 Mount the AuthProvider and guard protected routes in `src/app/layout.tsx`
    - Render `<AuthProvider>` directly inside `<PreferencesProvider>`; wrap the assistant home (`page.tsx`) and `settings/page.tsx` with the protected Route_Guard so they require a session
    - _Requirements: 4.5, 5.1, 5.2, 8.5_

  - [x] 12.2 Add the logout control to `src/components/AppHeader.tsx`
    - Render a `LogoutButton` only while `isAuthenticated`; disable it during an in-flight logout; call `auth.logout()` then navigate to `/login`; visibility derives from `isAuthenticated` so it disappears after logout
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 12.3 Write unit tests for the logout control
    - Control hidden when unauthenticated, visible when authenticated, disabled while in-flight, success and any-failure both clear + navigate to login, control removed after navigating to the Login_View
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6_

- [ ] 13. Smoke test for the single-client constraint
  - [ ]* 13.1 Extend `src/__tests__/frontend-stack.test.ts`
    - Assert no new HTTP client library is imported and all auth traffic routes through the API_Client (native fetch only)
    - _Requirements: 7.8_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirements (granular sub-requirement clauses) for traceability.
- Property tests use **fast-check** at a minimum of 100 iterations and follow the `DatasetCard.property.test.tsx` tagging convention; one property is realized by exactly one property-based test in its own file.
- Property tests are placed close to the module they validate so regressions surface early.
- Checkpoints provide incremental validation between layers.
- The 13 correctness properties map to tasks 2.2, 2.3 (P6, P7), 3.2, 3.3, 3.4 (P1, P2, P3), 4.2, 4.3 (P4, P5), 6.2, 6.3, 6.4 (P8, P10, P13), 7.2, 7.3 (P9, P11), and 9.2 (P12).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "9.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "9.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "3.4", "3.5", "4.2", "4.3", "4.4", "6.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "6.4", "6.5", "7.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "7.4", "10.1", "11.1"] },
    { "id": 5, "tasks": ["10.2", "10.3", "11.2"] },
    { "id": 6, "tasks": ["10.4", "12.1", "12.2"] },
    { "id": 7, "tasks": ["10.5", "10.6", "10.7", "12.3", "13.1"] }
  ]
}
```
