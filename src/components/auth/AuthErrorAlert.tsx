"use client";

// Accessible live region for surfacing an Auth_Error_Message on the auth views.
//
// Renders a `role="alert"` + `aria-live="assertive"` region so assistive
// technologies announce the message without moving keyboard focus away from the
// control the user currently occupies (Requirement 9.4). Styling stays on the
// semantic Theme_Token utilities (`border-error`, `text-error`, `bg-surface`)
// so it re-themes automatically across light/dark Color_Modes with no hard-coded
// color or spacing values (Requirement 9.5).
//
// When there is no message (null/undefined/empty) the component renders nothing,
// so the live region is only present while an error is being shown.

export type AuthErrorAlertProps = {
  /** The Auth_Error_Message to announce, or null/undefined when there is none. */
  message?: string | null;
};

export function AuthErrorAlert({ message }: AuthErrorAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-2xl border border-error bg-surface px-4 py-3 text-sm text-error shadow-sm"
    >
      {message}
    </div>
  );
}

export default AuthErrorAlert;
