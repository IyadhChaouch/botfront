# Requirements Document

## Introduction

This feature adds frontend authentication views to the existing Next.js application (`botfront`). It delivers the user-facing login and registration screens, client-side session handling, route protection for authenticated areas, logout, and consistent surfacing of authentication errors. The views integrate with the already-implemented stateless JWT authentication API in the Flask backend (`flaskback`): `POST /api/auth/register`, `POST /api/auth/login`, and `POST /api/auth/logout`. A successful login or registration returns a JSON body of the form `{ token, user }`, where `token` is a JWT and `user` describes the authenticated account.

The implementation follows the conventions already established in the codebase. All backend traffic is issued through the single typed API_Client at `src/lib/api/client.ts` using native `fetch` (no Axios, no TanStack Query). Cross-cutting client state is held in React Context only (no Redux/Zustand), mirroring the existing `PreferencesProvider`, and persisted to `localStorage` for continuity across reloads. Views are built as App Router pages and components under `src/app` and `src/components`, styled with the existing semantic Theme_Token utilities, and remain consistent with the established bilingual (FR/AR) and accessibility conventions. This spec covers only the frontend UI/UX and its integration with the existing backend auth API; it does not introduce new backend endpoints.

## Glossary

- **Frontend_App**: The Next.js (App Router) application in `botfront` that renders the user interface.
- **Backend_Auth_API**: The existing Flask authentication endpoints — `POST /api/auth/register`, `POST /api/auth/login`, and `POST /api/auth/logout`.
- **API_Client**: The single typed module at `src/lib/api/client.ts` that issues all HTTP requests using native `fetch`.
- **ApiError**: The existing error type thrown by the API_Client that carries the HTTP `status` and a message.
- **Access_Token**: The JWT string returned by the Backend_Auth_API in the `token` field on successful login or registration.
- **Authenticated_User**: The account object returned by the Backend_Auth_API in the `user` field, comprising at least an identifier, a username, an email, and a role.
- **Auth_Context**: The React Context provider that holds the current Access_Token and Authenticated_User and exposes login, register, and logout actions to the Frontend_App.
- **Session_Store**: The `localStorage`-backed persistence used by the Auth_Context to retain the Access_Token and Authenticated_User across reloads.
- **Login_View**: The page that collects a username (or email) and password and submits a Login_Request.
- **Registration_View**: The page that collects a username, an email, and a password and submits a Registration_Request.
- **Login_Request**: The request the Frontend_App sends to `POST /api/auth/login` with the submitted credentials.
- **Registration_Request**: The request the Frontend_App sends to `POST /api/auth/register` with the submitted username, email, and password.
- **Logout_Action**: The operation that calls `POST /api/auth/logout`, clears the Session_Store, and resets the Auth_Context.
- **Route_Guard**: The client-side mechanism that restricts access to a Protected_Route to an authenticated session.
- **Protected_Route**: A route that requires an authenticated session to render, such as the assistant home and settings pages.
- **Public_Route**: A route reachable without an authenticated session, such as the Login_View and Registration_View.
- **Auth_Error_Message**: The user-facing message the Frontend_App displays when an authentication request fails.

## Requirements

### Requirement 1: Login View

**User Story:** As a registered user, I want a login screen, so that I can authenticate and access the application.

#### Acceptance Criteria

1. WHERE the requested route is the login route, THE Frontend_App SHALL render the Login_View with a username field accepting 1 to 254 characters, a password field accepting 1 to 254 characters that rejects input beyond 254 characters, and a submit control.
2. WHEN a user submits the Login_View with a username and a password that are each non-empty after trimming leading and trailing whitespace, THE Frontend_App SHALL send a Login_Request to `POST /api/auth/login` through the API_Client with a request timeout of 10 seconds.
3. WHILE a Login_Request is in progress, THE Login_View SHALL disable the submit control, display a pending indicator, and ignore any additional submit attempts.
4. WHEN the Backend_Auth_API returns HTTP 200 with an Access_Token and an Authenticated_User, THE Frontend_App SHALL store the Access_Token and the Authenticated_User in the Auth_Context and navigate to the assistant home route.
5. IF the user submits the Login_View while the username or the password is empty or contains only whitespace, THEN THE Login_View SHALL block the submission, retain any entered values, and display a message identifying each missing field.
6. IF the Backend_Auth_API rejects the Login_Request with an authentication-failure response, THEN THE Login_View SHALL remove the pending indicator, re-enable the submit control, retain the entered username, clear the password field, and display an error message indicating the credentials are invalid.
7. IF the Login_Request fails due to a network error or returns no response within the 10-second timeout, THEN THE Login_View SHALL remove the pending indicator, re-enable the submit control, retain the entered username, and display an error message indicating the request could not be completed.
8. IF the Backend_Auth_API returns a response that is neither HTTP 200 nor an authentication-failure response, THEN THE Login_View SHALL remove the pending indicator, re-enable the submit control, retain the entered username, and display an error message indicating the request could not be completed.
9. IF the Backend_Auth_API returns HTTP 200 without an Access_Token or without an Authenticated_User, THEN THE Login_View SHALL remove the pending indicator, re-enable the submit control, retain the entered username, and display an error message indicating the request could not be completed.
10. THE Login_View SHALL render the password field with masked input.
11. THE Login_View SHALL provide a navigation control to the Registration_View.

### Requirement 2: Registration View

**User Story:** As a visitor, I want a sign-up screen, so that I can create an account and start using the application.

#### Acceptance Criteria

1. WHERE the requested route is the registration route, THE Frontend_App SHALL render the Registration_View with a username field, an email field, a password field, and a submit control.
2. WHEN a user submits the Registration_View with a username of 1 to 150 characters (after trimming leading and trailing whitespace), an email of 1 to 254 characters that matches the pattern local-part@domain with at least one character before the "@", at least one character between the "@" and a "." in the domain, and at least one character after that ".", and a password of 8 to 128 characters, THE Frontend_App SHALL send a Registration_Request to `POST /api/auth/register` through the API_Client.
3. WHILE a Registration_Request is in progress, THE Registration_View SHALL disable the submit control and display a pending indicator.
4. WHEN the Backend_Auth_API returns HTTP 201 confirming the new account, THE Frontend_App SHALL navigate to the Login_View and display a confirmation message prompting the user to log in.
5. IF the user submits the Registration_View while the trimmed username, the email, or the password is empty, THEN THE Registration_View SHALL block the submission, retain all entered field values, and display a message identifying every field that is empty.
6. IF the user submits the Registration_View with a username shorter than 1 or longer than 150 characters or a password shorter than 8 or longer than 128 characters, THEN THE Registration_View SHALL block the submission, retain all entered field values, and display a message identifying every field that is out of range.
7. IF the user submits the Registration_View with an email value that does not match the email format defined in criterion 2, THEN THE Registration_View SHALL block the submission, retain all entered field values, and display a message identifying the email as invalid.
8. IF the Backend_Auth_API returns HTTP 409 indicating the username or email is already registered, THEN THE Registration_View SHALL re-enable the submit control, remain on the Registration_View, retain the entered username and email values, and display an error message indicating that the account already exists.
9. IF a Registration_Request fails because the Backend_Auth_API returns an HTTP status of 400 or any status of 500 or greater, or the API_Client receives no response within 30 seconds, or the request fails due to a network error, THEN THE Registration_View SHALL re-enable the submit control, remain on the Registration_View, retain the entered username and email values, and display an error message indicating that registration could not be completed.
10. THE Registration_View SHALL render the password field with masked input.
11. THE Registration_View SHALL provide a navigation control to the Login_View.
12. WHEN a user activates the navigation control to the Login_View, THE Frontend_App SHALL navigate to the Login_View.

### Requirement 3: Authentication Error Surfacing

**User Story:** As a user, I want clear feedback when authentication fails, so that I understand what went wrong and how to proceed.

#### Acceptance Criteria

1. IF the Backend_Auth_API rejects a Login_Request with HTTP 401, THEN THE Login_View SHALL display an Auth_Error_Message indicating that the credentials are invalid within 2 seconds of receiving the response.
2. IF the Backend_Auth_API rejects a Registration_Request with HTTP 409, THEN THE Registration_View SHALL display an Auth_Error_Message indicating that the username or email is already taken within 2 seconds of receiving the response.
3. IF the Backend_Auth_API rejects a request with HTTP 400 whose response body contains a non-empty descriptive error, THEN the submitting view (the Login_View for a Login_Request or the Registration_View for a Registration_Request) SHALL display an Auth_Error_Message that includes that descriptive error text, truncated to a maximum of 200 characters.
4. IF the Backend_Auth_API rejects a request with HTTP 400 whose response body contains no descriptive error or an empty descriptive error, THEN the submitting view (the Login_View for a Login_Request or the Registration_View for a Registration_Request) SHALL display an Auth_Error_Message indicating that the submitted data is invalid.
5. IF an authentication request receives no HTTP response within 30 seconds, OR fails at the network layer before any HTTP response is received, THEN the submitting view (the Login_View for a Login_Request or the Registration_View for a Registration_Request) SHALL display an Auth_Error_Message indicating a network error AND SHALL retain the values previously entered in the form fields.
6. IF the Backend_Auth_API rejects a request with any non-2xx status other than HTTP 400, 401, or 409, THEN the submitting view (the Login_View for a Login_Request or the Registration_View for a Registration_Request) SHALL display an Auth_Error_Message that includes the returned HTTP status code.
7. WHEN the user resubmits the form while an Auth_Error_Message from a previous attempt is displayed, the submitting view (the Login_View for a Login_Request or the Registration_View for a Registration_Request) SHALL remove the previously displayed Auth_Error_Message before sending the new request, such that at most one Auth_Error_Message is displayed at any time.

### Requirement 4: Session Token Handling

**User Story:** As a user, I want my session to persist and be applied to my requests, so that I stay logged in across reloads without re-entering credentials.

#### Acceptance Criteria

1. WHEN the Auth_Context stores an Access_Token and an Authenticated_User, THE Session_Store SHALL persist the Access_Token and the Authenticated_User to `localStorage` within 1 second.
2. WHEN the Frontend_App loads and the Session_Store holds a non-empty Access_Token together with a complete Authenticated_User record, THE Auth_Context SHALL restore the Access_Token and the Authenticated_User into the active session within 1 second of load.
3. WHILE the Auth_Context holds a non-empty Access_Token, THE API_Client SHALL include the Access_Token in the `Authorization` request header in the form `Bearer <token>` for every request to the Backend_Auth_API that requires authentication.
4. WHEN a consumer reads the Auth_Context, THE Auth_Context SHALL expose a boolean flag indicating whether an authenticated session is active, and SHALL return the current Authenticated_User when a session is active and no Authenticated_User when no session is active.
5. IF an authenticated request returns HTTP 401, THEN THE Frontend_App SHALL clear the Session_Store, reset the Auth_Context to no active session, and navigate to the Login_View within 1 second.
6. IF persisting the Access_Token or the Authenticated_User to the Session_Store fails because `localStorage` is unavailable or its quota is exceeded, THEN THE Auth_Context SHALL retain the active session in memory and display an error indication that the session could not be saved.
7. IF the Session_Store holds a session record that cannot be parsed, holds an empty Access_Token, or lacks a complete Authenticated_User record at load time, THEN THE Auth_Context SHALL clear the Session_Store and start with no active session.
8. WHILE the Auth_Context holds no Access_Token, THE API_Client SHALL omit the `Authorization` header from requests to the Backend_Auth_API.

### Requirement 5: Route Protection

**User Story:** As a product owner, I want authenticated areas protected on the client, so that unauthenticated visitors are directed to log in.

#### Acceptance Criteria

1. WHILE no authenticated session is active, WHEN a user navigates to a Protected_Route, THE Route_Guard SHALL redirect the user to the Login_View within 100 milliseconds without rendering any Protected_Route content, and SHALL retain the originally requested Protected_Route path including any query string so it can be restored after a successful login.
2. WHILE an authenticated session is active, WHEN a user navigates to a Protected_Route, THE Route_Guard SHALL render the requested Protected_Route within 100 milliseconds of the navigation event without displaying the Login_View.
3. WHILE an authenticated session is active, WHEN a user navigates to the Login_View or the Registration_View, THE Route_Guard SHALL redirect the user to the assistant home route within 100 milliseconds.
4. WHILE the Auth_Context is restoring a session from the Session_Store, THE Route_Guard SHALL display a loading indicator rather than any requested Protected_Route content, and SHALL keep displaying it for no longer than 5 seconds before treating the restoration as failed.
5. IF the Auth_Context cannot restore an authenticated session from the Session_Store (no stored session, an invalid or expired session, or the restoration not completing within 5 seconds), THEN THE Route_Guard SHALL treat the user as unauthenticated, remove the loading indicator, and redirect the user to the Login_View within 100 milliseconds while retaining the originally requested Protected_Route path including any query string.
6. WHEN a user completes a successful login while a retained Protected_Route path is present, THE Route_Guard SHALL redirect the user to the retained Protected_Route path and clear the retained path.
7. WHEN a user completes a successful login while no retained Protected_Route path is present, THE Route_Guard SHALL redirect the user to the assistant home route.

### Requirement 6: Logout

**User Story:** As a logged-in user, I want to log out, so that my session token is discarded and my account is no longer accessible from the client.

#### Acceptance Criteria

1. WHILE an authenticated session is active, THE Frontend_App SHALL display a single logout control in the application header.
2. WHEN a user activates the logout control AND no Logout_Action request is currently in progress, THE Frontend_App SHALL send a Logout_Action request to `POST /api/auth/logout` through the API_Client with the Access_Token in the `Authorization` header, applying a request timeout of 10 seconds.
3. WHILE a Logout_Action request is in progress, THE Frontend_App SHALL disable the logout control so that no additional Logout_Action request can be initiated.
4. WHEN the Logout_Action completes with a success response, THE Frontend_App SHALL clear the Session_Store, reset the Auth_Context, and navigate to the Login_View within 2 seconds of receiving the response.
5. IF the Logout_Action request fails for any reason, including a non-success response, a network error, or the 10-second timeout elapsing, THEN THE Frontend_App SHALL clear the Session_Store, reset the Auth_Context, and navigate to the Login_View within 2 seconds of detecting the failure.
6. WHEN the Frontend_App navigates to the Login_View following a Logout_Action, THE Frontend_App SHALL remove the logout control from the application header.

### Requirement 7: API Client Auth Integration

**User Story:** As a developer, I want the auth endpoints accessed through the single typed API_Client, so that authentication traffic follows the established frontend conventions.

#### Acceptance Criteria

1. WHEN the Frontend_App invokes the login method, THE API_Client SHALL send the Login_Request to `POST /api/auth/login`, and on an HTTP status in the range 200-299 SHALL return both the Access_Token and the Authenticated_User parsed from the response body.
2. WHEN the Frontend_App invokes the registration method, THE API_Client SHALL send the Registration_Request to `POST /api/auth/register`, and on an HTTP status in the range 200-299 SHALL return the created-account result parsed from the response body.
3. WHEN the Frontend_App invokes the logout method, THE API_Client SHALL send the Logout_Action request to `POST /api/auth/logout` including the current Access_Token for authentication.
4. IF the Backend_Auth_API returns an HTTP status outside the range 200-299 to any auth method, THEN THE API_Client SHALL throw an ApiError carrying the returned HTTP status and the error message read from the response body, and SHALL NOT return any Access_Token or Authenticated_User.
5. IF a response with an HTTP status outside the range 200-299 contains no readable error message, THEN THE API_Client SHALL throw an ApiError carrying the returned HTTP status and a default message indicating that status, and SHALL NOT return any Access_Token or Authenticated_User.
6. IF an auth request fails to complete because no HTTP status is received within 30 seconds (network failure, connection failure, or timeout), THEN THE API_Client SHALL throw an ApiError indicating a network failure and SHALL NOT return any Access_Token or Authenticated_User.
7. IF a response with an HTTP status in the range 200-299 cannot be parsed into the expected result (malformed body, or a login response missing the Access_Token or the Authenticated_User), THEN THE API_Client SHALL throw an ApiError indicating an invalid response and SHALL NOT return any Access_Token or Authenticated_User.
8. THE Frontend_App SHALL issue all Backend_Auth_API requests through the API_Client and SHALL NOT introduce any additional HTTP client library beyond the native fetch already used by the API_Client.

### Requirement 8: Auth Context Provider

**User Story:** As a developer, I want authentication state held in a shared React Context, so that views and route protection read a single source of truth consistent with the existing preferences pattern.

#### Acceptance Criteria

1. WHEN the Auth_Context provider mounts and the Session_Store holds no Access_Token, THE Auth_Context SHALL initialize with no Access_Token and no Authenticated_User and expose an authentication status of not authenticated to consumers.
2. THE Auth_Context SHALL expose to consumers a login action, a register action, a Logout_Action, the current Access_Token (or none), the current Authenticated_User (or none), and a boolean authentication status.
3. WHEN the login action succeeds, THE Auth_Context SHALL set the returned Access_Token and Authenticated_User as the active session, persist them to the Session_Store, and set the authentication status to authenticated.
4. WHEN the Logout_Action runs, THE Auth_Context SHALL clear the Access_Token and Authenticated_User from the active session, remove them from the Session_Store, and set the authentication status to not authenticated.
5. THE Frontend_App SHALL mount the Auth_Context provider as an ancestor of the Login_View, the Registration_View, the Route_Guard, and the application header so that each can read the active session and the authentication status.
6. WHEN the register action succeeds, THE Auth_Context SHALL expose the registration result to the caller while leaving the active session, the persisted Session_Store contents, and the authentication status unchanged.
7. IF the login action or the register action fails, THEN THE Auth_Context SHALL leave the active session and the Session_Store contents unchanged, retain the prior authentication status, and expose an error indication to the caller.
8. WHEN the Auth_Context provider mounts and the Session_Store holds a non-empty Access_Token together with a complete Authenticated_User record (all required identity fields present), THE Auth_Context SHALL restore that Access_Token and Authenticated_User as the active session and set the authentication status to authenticated before any consumer component renders.
9. IF the Auth_Context provider mounts and the Session_Store holds an Access_Token without a complete Authenticated_User record, or holds an Authenticated_User record without a non-empty Access_Token, THEN THE Auth_Context SHALL remove the partial session from the Session_Store, initialize with no Access_Token and no Authenticated_User, and expose an authentication status of not authenticated.

### Requirement 9: Localization and Accessibility Consistency

**User Story:** As a user, I want the auth views to match the rest of the application's language and accessibility behavior, so that the experience is consistent.

#### Acceptance Criteria

1. WHILE the active locale is French or Arabic, THE Login_View and the Registration_View SHALL render every static label using the bilingual dictionary entry defined for that locale, with no label left untranslated.
2. WHILE the active locale is Arabic, THE Login_View and the Registration_View SHALL render their labels, input fields, and controls with a right-to-left text direction attribute applied to the view's root container.
3. THE Login_View and the Registration_View SHALL associate each input field with a visible label that is programmatically linked to that field through a label-to-field association resolvable by assistive technologies.
4. WHEN an Auth_Error_Message is displayed, THE Login_View and the Registration_View SHALL present it within a live region that is announced to assistive technologies within 1 second and SHALL NOT move keyboard focus away from the control the user currently occupies.
5. THE Login_View and the Registration_View SHALL style their labels, input fields, and controls exclusively using the existing semantic Theme_Token utilities, with no hard-coded color or spacing values.
6. WHILE the active locale is French, THE Login_View and the Registration_View SHALL render their labels, input fields, and controls with a left-to-right text direction attribute applied to the view's root container.
7. IF the bilingual dictionary has no entry for a label in the active locale, THEN THE Login_View and the Registration_View SHALL display the label using the default-locale dictionary entry as the fallback, and SHALL NOT render an empty, blank, or missing label.
8. WHEN the active color mode changes between light and dark, THE Login_View and the Registration_View SHALL re-render their labels, input fields, and controls using the Theme_Token values for the new color mode within 1 second, without a full page reload and while preserving any values already entered in the input fields.
