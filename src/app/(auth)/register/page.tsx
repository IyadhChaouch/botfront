// Registration route (`/register`) — a Public_Route in the `(auth)` route group.
//
// Renders the Registration_View (`RegisterForm`) inside the split-screen
// `AuthShell` (teal brand panel + form column), wrapped by the public-auth
// Route_Guard so an already-authenticated visitor is redirected to the
// assistant home and only unauthenticated visitors see the form
// (Requirement 2.1, 5.3). All styling is on semantic Theme_Token utilities so
// the view re-themes across light/dark Color_Modes and mirrors for Arabic via
// the inherited `dir` attribute (R9.5).

import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function RegisterPage() {
  return (
    <RouteGuard routeClass="public-auth">
      <AuthShell variant="register">
        <RegisterForm />
      </AuthShell>
    </RouteGuard>
  );
}
